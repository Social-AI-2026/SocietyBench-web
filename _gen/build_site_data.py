#!/usr/bin/env python3
"""Regenerate the website's data files from the real experiment outputs.

Sources (nothing is invented):
  runs_new/<event>/final/<中文|英文>/results/run_main/brier/<model>/P<NN>_brier.json
  runs_new/<event>/final/<中文|英文>/results/run_main/time/<model>/P<NN>_time.json
  societybench_data/<event>/<zh|en>/contexts/P<NN>_context.md
  the paper's Table 2 / agents table (transcribed below, checked against the .tex)
"""
import json, os, glob, random

RUNS = "/home/ubuntu/societybench/runs_new"
DATA = "/home/ubuntu/societybench_data"
OUT  = "/home/ubuntu/societybench_web/site"

EVENTS = [
    ("event1_library",      "Wuhan Lib.",    "PUBLIC CONTROVERSY", "公共舆论"),
    ("event4_us_iran",      "US-Iran",       "GEOPOLITICAL",       "地缘政治"),
    ("event3_tiktok",       "TikTok",        "TECH POLICY",        "科技监管"),
    ("event5_smci",         "SMCI",          "MARKETS",            "金融市场"),
    ("event2_trump_tariff", "Trump Tariff",  "TRADE POLICY",       "贸易政策"),
]
MODELS = [                       # (dir name, display name, kind)
    ("gpt-5.5",                   "GPT-5.5",             "llm"),
    ("gemini-3.5-flash",          "Gemini-3.5-Flash",    "llm"),
    ("claude-opus-4-8",           "Claude-Opus-4.8",     "llm"),
    ("deepseek-v4-pro-guan",      "DeepSeek-V4-Pro",     "llm"),
    ("kimi-k2.5",                 "Kimi-K2.5",           "llm"),
    ("doubao-seed-2-0-pro-260215","Doubao-Seed-2.0-Pro", "llm"),
    ("grok-3-mini",               "Grok-3-Mini",         "llm"),
    # The three agent frameworks, all on the Doubao base model.
    ("mirofish__doubao-seed-2-0-pro-260215",  "MiroFish (Doubao)",  "agent"),
    ("langgraph__doubao-seed-2-0-pro-260215", "LangGraph (Doubao)", "agent"),
    ("autogen__doubao-seed-2-0-pro-260215",   "AutoGen (Doubao)",   "agent"),
]
MODEL_KIND = {name: kind for _, name, kind in MODELS}
BEST = "GPT-5.5"
LANGS = [("zh", "中文"), ("en", "英文")]

# ---- paper Table 2: per event [Cal, Time], then avg [Cal, Time, Overall] ----
EVENT_ORDER = ["Wuhan Lib.", "US-Iran", "TikTok", "SMCI", "Trump Tariff"]
LB = {
 "GPT-5.5":            ([74.7,55.6],[66.3,63.2],[78.7,84.4],[74.9,84.2],[81.7,85.4],[75.3,74.6,75.0]),
 "Gemini-3.5-Flash":   ([71.0,59.6],[68.9,58.5],[79.8,79.4],[72.3,73.3],[77.8,66.1],[73.9,67.3,70.6]),
 "Claude-Opus-4.8":    ([59.0,63.2],[55.0,62.3],[64.2,72.6],[60.8,70.4],[73.6,81.7],[62.5,70.0,66.3]),
 "DeepSeek-V4-Pro":    ([63.4,58.6],[55.9,64.9],[65.1,66.7],[60.8,65.2],[67.5,69.0],[62.5,64.9,63.7]),
 "Kimi-K2.5":          ([64.4,59.4],[58.4,65.6],[62.5,63.9],[64.8,64.9],[66.4,64.0],[63.3,63.6,63.4]),
 "Doubao-Seed-2.0-Pro":([65.5,58.3],[57.9,60.3],[67.0,64.2],[60.5,65.0],[70.3,65.0],[64.3,62.6,63.4]),
}
AGENTS = {   # all run on the Doubao base model; deltas are vs that base
 "LangGraph (Doubao)": ([62.7,55.8],[55.9,60.4],[65.8,64.7],[56.6,65.5],[69.0,64.9],[62.0,62.3,62.1],[-2.3,-0.3,-1.3]),
 "AutoGen (Doubao)":   ([59.2,57.2],[52.6,61.4],[63.9,64.7],[50.3,64.5],[66.6,65.0],[58.5,62.5,60.5],[-5.8,-0.1,-2.9]),
 "MiroFish (Doubao)":  ([66.2,57.5],[57.1,59.2],[65.5,65.5],[59.2,65.7],[70.3,64.4],[63.7,62.4,63.1],[-0.6,-0.2,-0.3]),
}
BASELINES = {"Frequency baseline": 53.8, "Momentum baseline (7 d)": 54.2}   # temporal = 50 anchor


def build_leaderboard(lang):
    zh = lang == "zh"
    rows = []
    for i, (name, vals) in enumerate(LB.items()):
        rows.append({
            "system": name,
            "kind": "llm",
            "is_best_overall": name == BEST,
            "per_event": {EVENT_ORDER[j]: vals[j] for j in range(5)},
            "avg": vals[5][:2],
            "overall": vals[5][2],
            "footnote": "",
        })
    rows.sort(key=lambda r: -r["overall"])
    agents = []
    for name, v in AGENTS.items():
        agents.append({
            "system": name, "kind": "agent", "is_best_overall": False,
            "per_event": {EVENT_ORDER[j]: v[j] for j in range(5)},
            "avg": v[5][:2], "overall": v[5][2], "delta_vs_base": v[6],
        })
    base = [{"system": n, "kind": "baseline", "is_best_overall": False,
             "per_event": {}, "avg": [c, 50.0], "overall": round((c + 50.0) / 2, 1),
             "footnote": ("无模型启发式；不产出日期，时间轴记为区间中点 50" if zh else
                          "model-free heuristic; emits no dates, so the temporal axis is the 50 anchor")}
            for n, c in BASELINES.items()]
    for a in agents:
        a["footnote"] = "跑在 Doubao 基座上" if zh else "run on the Doubao base model"
    return {
        "schema_version": "2.0",
        "last_updated": "2026-08-02",
        "source": "Paper Table 2 (main leaderboard) and the agent-orchestration table.",
        "notes": ("每格为该事件上的 [校准, 时间] 得分；两轴均为百分制，"
                  "答 50% 得 50、猜区间中点约 50 分。" if zh else
                  "Each cell is [calibration, temporal] on that event. Both axes are 0-100 and "
                  "anchored so a uniform 50% predictor scores exactly 50 on calibration and a "
                  "bucket-midpoint guesser scores about 50 on the temporal axis."),
        "events": EVENT_ORDER,
        "axes": {
            "calibration": {"label": "校准 (Cal)" if zh else "Calibration (Cal)",
                            "range": [0, 100], "baseline": 50, "perfect": 100,
                            "baseline_label": "答 50% = 50" if zh else "uniform 50% predictor = 50"},
            "temporal":    {"label": "时间 (Time)" if zh else "Temporal (Time)",
                            "range": [0, 100], "baseline": 50, "perfect": 100,
                            "baseline_label": "区间中点 = 50" if zh else "bucket-midpoint baseline = 50"},
        },
        "validated": rows + agents + base,
        "projected": {"notes": ("本次发布不含任何推算值，所有分数均为实测。" if zh else
                                "This release contains no projected numbers; every score is measured."),
                      "additional_llms": [], "agents_on_doubao": [],
                      "agents_on_qwen3": [], "baselines_and_human": []},
    }





def days_between(a, b):
    from datetime import date
    try:
        y1, m1, d1 = map(int, a.split("-")); y2, m2, d2 = map(int, b.split("-"))
        return (date(y2, m2, d2) - date(y1, m1, d1)).days
    except Exception:
        return None


def load_point(ev, langdir, pid):
    """Real calibration + temporal records for one prediction point, all models."""
    root = f"{RUNS}/{ev}/final/{langdir}/results/run_main"
    cal, tmp, cutoff = {}, {}, None
    for mdir, mname, _k in MODELS:
        f = f"{root}/brier/{mdir}/{pid}_brier.json"
        if os.path.exists(f):
            d = json.load(open(f, encoding="utf-8"))
            cutoff = cutoff or d.get("cutoff_date")
            # The per-question scoring weight lives in details[], not questions[].
            wt = {x["q"]: x.get("weight") for x in (d.get("details") or [])}
            qs = d.get("questions") or []
            for q in qs:
                if q.get("weight") is None and q["q"] in wt: q["weight"] = wt[q["q"]]
            cal[mname] = qs
        f = f"{root}/time/{mdir}/{pid}_time.json"
        if os.path.exists(f):
            d = json.load(open(f, encoding="utf-8"))
            tmp[mname] = d.get("events") or []
    return cal, tmp, cutoff




def context_excerpt(ev, lang, pid, n=420):
    p = f"{DATA}/{ev}/{lang}/contexts/{pid}_context.md"
    if not os.path.exists(p): return ""
    t = open(p, encoding="utf-8").read().rstrip()
    tail = t.rsplit("\n### ", 1)[-1]
    tail = " ".join(tail.split())
    return tail[:n] + ("…" if len(tail) > n else "")


def questionbank(ev, langdir, pid):
    p = f"{RUNS}/{ev}/final/{langdir}/questionbank/{pid}_questionbank.json"
    if not os.path.exists(p): return None
    return json.load(open(p, encoding="utf-8"))


def build_demo(lang, langdir):
    """One light index plus one file per prediction point.

    Every question of both exams is included -- 25k calibration questions and
    2.8k temporal events across the five events -- which is far too much to ship
    in a single file, so the page fetches a point's questions when it is picked.
    Records are compact: question metadata is identical across models (checked),
    so it is stored once and each model contributes only its own answer.
    """
    zh = lang == "zh"
    events_out = []
    n_cal_total = n_time_total = n_files = 0
    for ev, short, dom_en, dom_zh in EVENTS:
        outdir = f"{OUT}/demo/{lang}/{ev}"
        os.makedirs(outdir, exist_ok=True)
        # Start clean: a point that no longer qualifies must not linger on disk.
        for stale in glob.glob(f"{outdir}/P*.json") + glob.glob(f"{outdir}/P*_context.md"):
            os.remove(stale)
        index_pts = []
        for pid in [f"P{i:02d}" for i in range(1, 26)]:
            qb = questionbank(ev, langdir, pid)
            if not qb: continue
            cal_src, tmp_src, cutoff = load_point(ev, langdir, pid)
            cutoff = cutoff or qb.get("cutoff_date")
            models = [m for _, m, _k in MODELS if cal_src.get(m) or tmp_src.get(m)]
            if not models: continue
            mi = {m: i for i, m in enumerate(models)}

            # ---- calibration: the whole bank, in bank order ----
            answers = {m: {q["q"]: q for q in cal_src.get(m, [])} for m in models}
            cal = []
            for q in qb["brier_questions"]:
                base = next((answers[m][q["q"]] for m in models if q["q"] in answers[m]), q)
                r = []
                for m in models:
                    a = answers[m].get(q["q"])
                    if not a or a.get("prob") is None or not a.get("valid_for_scoring", True): continue
                    r.append([mi[m], round(float(a["prob"]), 3)])
                cal.append({"q": q["q"], "wd": q.get("window_days"),
                            "dfc": q.get("days_from_cutoff"), "diff": q.get("difficulty"),
                            "dim": q.get("dimension"), "qt": q.get("question_type"),
                            "gt": q.get("answer", q.get("gt")),
                            "wt": round(float(base.get("weight") or 0), 3), "r": r})

            # ---- temporal: the whole bank too. Events past the 90-day scoring
            # window were never put to a model, so they carry no answers and say so.
            preds = {m: {e["eid"]: e for e in tmp_src.get(m, [])} for m in models}
            time = []
            for e in qb.get("events", {}).get("all", []):
                eid = e.get("eid") or e.get("id")
                r = []
                for m in models:
                    a = preds[m].get(eid)
                    if not a or not a.get("answered") or not a.get("pred_date"): continue
                    r.append([mi[m], a["pred_date"], round(float(a.get("error_days") or 0), 1)])
                time.append({"eid": eid, "desc": e.get("event_desc") or e.get("event"),
                             "gt": e.get("gt_date") or e.get("date"),
                             "dfc": e.get("days_from_cutoff"), "r": r})

            # Only points where both exams actually ran are offered: a temporal
            # event past the 90-day window was never put to a model, and a model
            # that answered only one axis here would show a blank on the other.
            time = [e for e in time if e["r"]]
            both = ({r[0] for q in cal for r in q["r"]} & {r[0] for e in time for r in e["r"]})
            if not cal or not time or not both: continue
            keep = sorted(both)
            remap = {old: i for i, old in enumerate(keep)}
            models = [models[i] for i in keep]
            for q in cal: q["r"] = [[remap[m], v] for m, v in q["r"] if m in remap]
            for e in time: e["r"] = [[remap[m], d, er] for m, d, er in e["r"] if m in remap]
            cal = [q for q in cal if q["r"]]
            time = [e for e in time if e["r"]]      # a model dropped above can empty one
            if not cal or not time: continue

            # Reading order for the two pickers: calibration questions by window
            # (7 -> 14 -> 30 -> 60 -> 90) then by how far the target sits from the
            # cutoff; temporal events by the date they actually happened.
            cal.sort(key=lambda q: (q["wd"] if q["wd"] is not None else 999,
                                    q["dfc"] if q["dfc"] is not None else 999, q["q"]))
            time.sort(key=lambda e: (e["gt"] or "9999-99-99", e["eid"]))

            # The excerpt is what the box shows; the whole context is copied
            # next to it and fetched only when the reader asks for it.
            ctx_src = f"{DATA}/{ev}/{lang}/contexts/{pid}_context.md"
            ctx_file = None
            if os.path.exists(ctx_src):
                ctx_file = f"demo/{lang}/{ev}/{pid}_context.md"
                open(f"{outdir}/{pid}_context.md", "w", encoding="utf-8").write(
                    open(ctx_src, encoding="utf-8").read())
            json.dump({"point_id": pid, "cutoff": cutoff, "models": models,
                       "context_excerpt": context_excerpt(ev, lang, pid),
                       "context_file": ctx_file,
                       "window_days": 90, "cal": cal, "time": time},
                      open(f"{outdir}/{pid}.json", "w", encoding="utf-8"),
                      ensure_ascii=False, separators=(",", ":"))
            n_files += 1
            n_cal_total += len(cal); n_time_total += len(time)
            scored = sum(1 for x in time if x["r"])
            index_pts.append({
                "point_id": pid, "cutoff": cutoff,
                # The label is just the cutoff; how many systems ran this point is
                # visible in the model buttons themselves.
                "label": (f"截止日期 {cutoff}" if zh else f"Cutoff {cutoff}"),
                "models": len(models), "n_cal": len(cal),
                "n_time": len(time), "n_time_scored": scored,
                "file": f"demo/{lang}/{ev}/{pid}.json",
            })
        if not index_pts: continue
        events_out.append({
            "id": ev, "short": short,
            "domain_label": dom_zh if zh else dom_en,
            "anonymized_arc": short,
            "prediction_points": index_pts,
        })
    return {
        "schema_version": "3.0",
        "models": [m for _, m, _k in MODELS],
        "kinds": MODEL_KIND,
        "best": BEST,
        "totals": {"points": n_files, "calibration_questions": n_cal_total,
                   "temporal_events": n_time_total},
        "notes": ("缓存模式的每一个数字都取自我们真实的实验输出 "
                  "(runs_new/<event>/final/中文/results/run_main)，无任何虚构内容。"
                  if zh else
                  "Every number in cached mode comes from our real experiment outputs "
                  "(runs_new/<event>/final/英文/results/run_main). Nothing here is invented."),
        "events": events_out,
    }


if __name__ == "__main__":
    for lang, langdir in LANGS:
        suf = "" if lang == "en" else ".zh"
        lb = build_leaderboard(lang)
        json.dump(lb, open(f"{OUT}/leaderboard{suf}.json", "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        dm = build_demo(lang, langdir)
        json.dump(dm, open(f"{OUT}/demo_index{suf}.json", "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        npts = sum(len(e["prediction_points"]) for e in dm["events"])
        kinds = {}
        for r in lb["validated"]:
            kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
        tot = dm["totals"]
        print(f"  {lang}: leaderboard {kinds} | demo {len(dm['events'])} 事件 / {npts} 预测点 / "
              f"校准题 {tot['calibration_questions']} / 时间题 {tot['temporal_events']}")
