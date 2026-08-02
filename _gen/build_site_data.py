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
MODELS = [                       # (dir name, display name)
    ("gpt-5.5",                   "GPT-5.5"),
    ("gemini-3.5-flash",          "Gemini-3.5-Flash"),
    ("claude-opus-4-8",           "Claude-Opus-4.8"),
    ("deepseek-v4-pro-guan",      "DeepSeek-V4-Pro"),
    ("kimi-k2.5",                 "Kimi-K2.5"),
    ("doubao-seed-2-0-pro-260215","Doubao-Seed-2.0-Pro"),
]
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



def available_points(ev, langdir, want=None):
    """Every prediction point of this event that at least one model actually ran on
    both axes. The three foreign models only ran a cost-saving subset on events 2-5,
    so a point may carry fewer than six models -- the page states how many it has and
    only ever compares the models that are really there. Pass `want` to thin the list
    evenly; the default keeps all of them."""
    root = f"{RUNS}/{ev}/final/{langdir}/results/run_main"
    allpts = set()
    for mdir, _ in MODELS:
        for f in glob.glob(f"{root}/brier/{mdir}/P*_brier.json"):
            pid = os.path.basename(f).split("_")[0]
            tf = f"{root}/time/{mdir}/{pid}_time.json"
            if os.path.exists(tf) and json.load(open(tf, encoding="utf-8")).get("events"):
                allpts.add(pid)
    allpts = sorted(allpts)
    if want is None or len(allpts) <= want: return allpts
    step = (len(allpts) - 1) / (want - 1)
    return [allpts[round(i * step)] for i in range(want)]


def _by_model(responses, model):
    return next((r for r in responses if r["model"] == model), None)


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
    for mdir, mname in MODELS:
        f = f"{root}/brier/{mdir}/{pid}_brier.json"
        if os.path.exists(f):
            d = json.load(open(f, encoding="utf-8"))
            cutoff = cutoff or d.get("cutoff_date")
            cal[mname] = d.get("questions") or []
        f = f"{root}/time/{mdir}/{pid}_time.json"
        if os.path.exists(f):
            d = json.load(open(f, encoding="utf-8"))
            tmp[mname] = d.get("events") or []
    return cal, tmp, cutoff


def pick_questions(cal, k=10):
    """The calibration questions every model answered, spread over difficulty and
    window so the selector offers a real range rather than ten near-identical items."""
    names = list(cal)
    if not names: return None
    pool, seen = {}, {}
    for m in names:
        for q in cal[m]:
            if q.get("prob") is None or not q.get("valid_for_scoring", True): continue
            pool.setdefault(q["q"], q)
            seen[q["q"]] = seen.get(q["q"], 0) + 1
    if not pool: return None
    # Prefer the questions the most models answered -- those are the comparable ones.
    top = max(seen.values())
    ranked = sorted((pool[q] for q, n in seen.items() if n == top),
                    key=lambda q: (q.get("difficulty") != "hard",
                                   abs(q.get("days_from_cutoff") or 999)))
    if not ranked: return []
    if len(ranked) <= k: return [q["q"] for q in ranked]
    step = (len(ranked) - 1) / (k - 1)
    return [ranked[round(i * step)]["q"] for i in range(k)]


def pick_events(tmp, cutoff=None, k=8):
    names = list(tmp)
    if not names: return None
    recs, seen = {}, {}
    for m in names:
        for e in tmp[m]:
            if not e.get("answered") or not e.get("pred_date"): continue
            recs.setdefault(e["eid"], e)
            seen[e["eid"]] = seen.get(e["eid"], 0) + 1
    if not recs: return None
    top = max(seen.values())
    common = [recs[i] for i, n in seen.items() if n == top]
    fut = [e for e in common if (e.get("gt_date") or "") > (cutoff or "")]
    pool = sorted(fut or common, key=lambda e: e.get("gt_date") or "")
    if len(pool) <= k: return [e["eid"] for e in pool]
    step = (len(pool) - 1) / (k - 1)
    return [pool[round(i * step)]["eid"] for i in range(k)]


def context_excerpt(ev, lang, pid, n=420):
    p = f"{DATA}/{ev}/{lang}/contexts/{pid}_context.md"
    if not os.path.exists(p): return ""
    t = open(p, encoding="utf-8").read().rstrip()
    tail = t.rsplit("\n### ", 1)[-1]
    tail = " ".join(tail.split())
    return tail[:n] + ("…" if len(tail) > n else "")


def build_demo(lang, langdir):
    zh = lang == "zh"
    events_out = []
    for ev, short, dom_en, dom_zh in EVENTS:
        pts = []
        for pid in available_points(ev, langdir):
            cal, tmp, cutoff = load_point(ev, langdir, pid)
            # Keep whatever ran. A point with three models is still real data; it is
            # labelled as such so nobody reads it as a six-way comparison.
            cal = {m: v for m, v in cal.items() if v}
            tmp = {m: v for m, v in tmp.items() if v}
            models_here = [m for m in cal if m in tmp]
            if not models_here: continue
            cal = {m: cal[m] for m in models_here}
            tmp = {m: tmp[m] for m in models_here}
            qtexts = pick_questions(cal)
            eids   = pick_events(tmp, cutoff)
            if not qtexts or not eids: continue
            yes, no = ("是", "否") if zh else ("yes", "no")

            cal_qs = []
            for qtext in qtexts:
                base = next(q for m in models_here for q in cal[m] if q["q"] == qtext)
                resp = []
                for _, mname in MODELS:
                    if mname not in cal: continue
                    q = next((x for x in cal[mname] if x["q"] == qtext
                              and x.get("prob") is not None
                              and x.get("valid_for_scoring", True)), None)
                    if not q: continue
                    ph = round(float(q["prob"]), 3)
                    err = round(abs(ph - q["answer"]), 3)
                    w = round(float(q.get("weight") or 0), 3)
                    side = (ph > 0.5) == (q["answer"] == 1)
                    resp.append({"model": mname, "is_best_overall": mname == BEST,
                        "p_hat": ph, "abs_error": err, "weight": w, "correct_side": side,
                        "reasoning": (f"答 {ph:.0%}；真值{yes if q['answer']==1 else no}。绝对误差 {err:.2f}，该题权重 {w:.2f}。"
                                      if zh else
                                      f"Answered {ph:.0%}; ground truth {yes if q['answer']==1 else no}. "
                                      f"Absolute error {err:.2f}, question weight {w:.2f}.")})
                if not resp: continue
                cal_qs.append({"q": qtext, "window_days": base.get("window_days"),
                    "days_from_cutoff": base.get("days_from_cutoff"),
                    "difficulty": base.get("difficulty"), "dimension": base.get("dimension"),
                    "question_type": base.get("question_type"), "gt": base.get("answer"),
                    "gt_note": (("该事件在窗口内确实发生" if base.get("answer") == 1 else "该事件在窗口内并未发生")
                                if zh else
                                ("the event did occur inside the window" if base.get("answer") == 1
                                 else "the event did not occur inside the window")),
                    "responses": resp})

            time_qs = []
            for eid in eids:
                base = next(e for m in models_here for e in tmp[m] if e["eid"] == eid)
                resp = []
                for _, mname in MODELS:
                    if mname not in tmp: continue
                    e = next((x for x in tmp[mname] if x["eid"] == eid
                              and x.get("answered") and x.get("pred_date")), None)
                    if not e: continue
                    derr = float(e.get("error_days") or 0)
                    resp.append({"model": mname, "is_best_overall": mname == BEST,
                        "pred_date": e["pred_date"], "d_hat_label": e["pred_date"],
                        "d_hat_day": days_between(cutoff, e["pred_date"]), "abs_error_days": derr,
                        "reasoning": (f"预测 {e['pred_date']}，实际 {e['gt_date']}，相差 {derr:.0f} 天。"
                                      if zh else
                                      f"Predicted {e['pred_date']}, actual {e['gt_date']}, off by {derr:.0f} days.")})
                if not resp: continue
                time_qs.append({"q": ("这个事件会在哪一天发生？" if zh else "On what date does this event happen?"),
                    "eid": eid, "event_desc": base.get("event_desc"), "gt_date": base.get("gt_date"),
                    "gt_label": base.get("gt_date"), "gt_day": days_between(cutoff, base.get("gt_date")),
                    "responses": resp})

            if not cal_qs or not time_qs: continue
            pts.append({
                "point_id": pid,
                "cutoff_label": ((f"截止日期 {cutoff}" if zh else f"Cutoff {cutoff}")
                                 + ("" if len({r["model"] for q in cal_qs for r in q["responses"]}) == len(MODELS)
                                    else (f" · {len({r['model'] for q in cal_qs for r in q['responses']})} 个模型" if zh
                                          else f" · {len({r['model'] for q in cal_qs for r in q['responses']})} models"))),
                "models_covered": len({r["model"] for q in cal_qs for r in q["responses"]}),
                "cutoff_short": cutoff,
                "context_excerpt": context_excerpt(ev, lang, pid),
                "calibration_questions": cal_qs,
                "temporal_events": time_qs,
                # Mirrors of the first entry so any renderer that predates the
                # selectors keeps working unchanged.
                "calibration_question": {k: v for k, v in cal_qs[0].items() if k != "responses"},
                "temporal_question": {k: v for k, v in time_qs[0].items() if k != "responses"},
                "model_responses": [
                    {"model": c["model"], "is_best_overall": c["is_best_overall"],
                     "calibration": {k: v for k, v in c.items() if k not in ("model", "is_best_overall")},
                     "temporal": {k: v for k, v in tq.items() if k not in ("model", "is_best_overall")},
                     "score_label": (f"方向{'正确' if c['correct_side'] else '错误'}，绝对误差 {c['abs_error']:.2f}；"
                                     f"日期相差 {tq['abs_error_days']:.0f} 天。" if zh else
                                     f"Direction {'right' if c['correct_side'] else 'wrong'}, absolute error "
                                     f"{c['abs_error']:.2f}; date off by {tq['abs_error_days']:.0f} days.")}
                    for c, tq in ((c, _by_model(time_qs[0]["responses"], c["model"]))
                                  for c in cal_qs[0]["responses"])
                    if tq],
            })
        if not pts: continue
        # Fallback preset list for the live tab. The page normally derives its
        # presets from the selected point; this is only used by older renderers,
        # so take the first point that actually has questions.
        live = []
        for p0 in pts:
            for i, q in enumerate(p0["calibration_questions"][:4], 1):
                live.append({"id": f"{p0['point_id']}·C{i}", "type": "calibration",
                             "window": q.get("window_days"), "text": q["q"]})
            if live: break
        events_out.append({
            "id": ev, "short": short,
            "domain_label": dom_zh if zh else dom_en,
            "anonymized_arc": short,
            "live_questions": live,
            "prediction_points": pts,
        })
    return {
        "schema_version": "2.0",
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
        json.dump(dm, open(f"{OUT}/interactive_demo{suf}.json", "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        npts = sum(len(e["prediction_points"]) for e in dm["events"])
        kinds = {}
        for r in lb["validated"]:
            kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
        print(f"  {lang}: leaderboard {kinds} | demo {len(dm['events'])} 事件 / {npts} 预测点")
