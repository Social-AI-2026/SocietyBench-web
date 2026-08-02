#!/usr/bin/env python3
"""Rebuild experiments.json from the paper's tables and the ablation run files.

The first three blocks are transcribed from the paper; the rest are read
straight out of runs_new/_ablation/run_main/, which holds the frozen values the
paper and the ablation write-up were computed from.
"""
import json, os, glob
OUT = "/home/ubuntu/societybench_web/site"
RUNS = "/home/ubuntu/societybench/runs_new"
ABL = "/home/ubuntu/societybench/runs_new/_ablation/run_main"


def abl(name):
    p = f"{ABL}/{name}"
    if not os.path.exists(p): return None
    return json.load(open(p, encoding="utf-8"))


def r1(x):
    return None if x is None else round(float(x), 1)


def cols(*pairs):
    return [{"key": k, "title": ti} for k, ti in pairs]


def rows(items):
    return [dict(zip(("label","doubao","doubao_delta","gpt","gpt_delta","mean","mean_delta","is_baseline"), r))
            for r in items]

def build(zh):
    L = (lambda a, b: a if zh else b)
    return {
      "schema_version": "2.0",
      "notes": L("全部取自论文的消融表与压力事件表,无推算值。",
                 "Taken from the paper's own ablation and stress-case tables. No projected numbers."),
      "stress_case": {
        "title": L("压力事件", "Stress-case events"),
        "subtitle": L("两个把模型差距拉到最大的事件:最强的 GPT-5.5 对最弱的 Kimi-K2.5。",
                      "The two events that stretch the models furthest apart: GPT-5.5 against Kimi-K2.5."),
        "events": [
          {"name": "SMCI", "label": L("金融市场 · 退市危机", "Financial markets - delisting crisis"),
           "stats": {"n_pts": 25, "arc_days": 468, "n_cal": 3196, "n_time": 528},
           "mean": {"cal": 65.7, "time": 70.5},
           "gemini": {"cal": 74.9, "time": 84.2, "is_best": True, "label": "GPT-5.5"},
           "qwen3":  {"cal": 64.8, "time": 64.9, "label": "Kimi-K2.5"},
           "gap": {"cal": 10.1, "cal_pct_of_mean": 16, "time": 19.3, "time_pct_of_mean": 30},
           "axis_winner": "time",
           "takeaway": L("SMCI 围绕公司层面的具体数字披露展开,奖励精确的不确定性处理——两条轴上 GPT 对 Kimi 都是两位数差距。", "SMCI is built around company-specific numerical disclosures, which reward precise uncertainty handling: the GPT-Kimi gap is double-digit on both axes.")},
          {"name": "Trump Tariff", "label": L("贸易政策 · 对等关税升级", "Trade policy - reciprocal-tariff escalation"),
           "stats": {"n_pts": 25, "arc_days": 2930, "n_cal": 8035, "n_time": 976},
           "mean": {"cal": 72.9, "time": 71.9},
           "gemini": {"cal": 81.7, "time": 85.4, "is_best": True, "label": "GPT-5.5"},
           "qwen3":  {"cal": 66.4, "time": 64.0, "label": "Kimi-K2.5"},
           "gap": {"cal": 15.3, "cal_pct_of_mean": 23, "time": 21.4, "time_pct_of_mean": 33},
           "axis_winner": "time",
           "takeaway": L("关税事件上多数模型的校准分是全场最好的,时间轴却出现了整张表最大的单事件差距:21.4 分。", "On the tariff event most models post their best calibration scores, yet the temporal axis opens the largest single-event gap in the whole table: 21.4 points.")},
        ],
      },
      "ablations": {
        "question_bank_composition": {
          "title": L("题库构成", "Question-bank composition"),
          "subtitle": L("每次移除一类题再重新计分。下标是相对完整题库的变化。",
                        "Drop one subset of the bank at a time and re-score. Subscripts are relative to the full bank."),
          "rows": rows([
            (L("− A 类(时间梯度,47%)","− A-type (time-gradient, 47%)"), 70.7, 6.4, 83.4, 8.1, 74.2, 7.2, False),
            (L("− B 类(具体度,23%)","− B-type (specificity, 23%)"),     62.9, -1.4, 74.1, -1.2, 66.2, -0.8, False),
            (L("− C 类(结果变种,12%)","− C-type (variants, 12%)"),      63.9, -0.4, 74.8, -0.5, 66.6, -0.4, False),
            (L("− D 类(构造假题,18%)","− D-type (designed-false, 18%)"),62.1, -2.2, 72.2, -3.1, 63.6, -3.4, False),
            (L("完整题库(本文,约 25k 题/版)","Full bank (ours, ~25k Q/edition)"), 64.3, 0.0, 75.3, 0.0, 67.0, 0.0, True),
          ]),
          "takeaway": L("移除 A 类使均值升幅最大(+7.2),说明难度主要由它承担:模型系统性高估热点叙事在近期延续的概率。",
                        "Dropping A inflates the mean the most (+7.2), so A carries most of the difficulty: models over-bet on a hot narrative continuing in the near term."),
        },
        "scoring_formula": {
          "title": L("计分公式", "Calibration scoring formula"),
          "subtitle": L("同一批作答换用不同规则重新计分。Gap 为 GPT 与 Doubao 之差。",
                        "The same answers re-scored under alternative rules. Gap is GPT minus Doubao."),
          "rows": [
            {"label": L("Brier(重标度)","Brier score (rescaled)"),        "doubao": 57.4, "doubao_delta": -6.9, "gpt": 70.8, "gpt_delta": -4.5, "gap": 13.4, "is_baseline": False},
            {"label": L("对数损失(重标度)","Log-loss (rescaled)"),          "doubao": 45.4, "doubao_delta": -18.9, "gpt": 65.0, "gpt_delta": -10.3, "gap": 19.6, "is_baseline": False},
            {"label": L("双曲映射","Hyperbolic score mapping"),            "doubao": 73.4, "doubao_delta": 9.1, "gpt": 80.1, "gpt_delta": 4.8, "gap": 6.7, "is_baseline": False},
            {"label": L("加权 MAE(本文, α=0.04)","Weighted MAE (ours, α=0.04)"), "doubao": 64.3, "doubao_delta": 0.0, "gpt": 75.3, "gpt_delta": 0.0, "gap": 11.0, "is_baseline": True},
          ],
          "takeaway": L("每种规则下 GPT–Doubao 的差都为正,排名不依赖规则选择;而严格评分规则反而把差距拉大,说明我们的加权 MAE 是更温和的选择。",
                        "Under every rule the GPT-Doubao gap stays positive, so the ranking does not depend on the rule; the proper scoring rules in fact widen it, which makes our weighted MAE the gentler choice."),
        },
        "true_false_bias": {
          "title": L("真假题偏置", "True/false-question bias"),
          "subtitle": L("按真值把校准题分成两半。六模型均值。",
                        "The calibration bank split by ground-truth polarity. Six-LLM means."),
          "rows": [
            {"label": L("真题(事件确实发生)","True (the event did occur)"),  "doubao": 59.8, "dseek": 49.3, "opus": 46.4, "gemini": 72.0, "gpt": 73.5, "mean": 60.3},
            {"label": L("假题(事件并未发生)","False (it did not)"),          "doubao": 71.6, "dseek": 79.9, "opus": 84.3, "gemini": 76.6, "gpt": 78.3, "mean": 76.1},
            {"label": L("偏置","Bias"), "doubao": 11.8, "dseek": 30.6, "opus": 38.0, "gemini": 4.7, "gpt": 4.8, "mean": 15.9, "is_delta": True},
          ],
          "takeaway": L("模型否定假事件的能力系统性强于确认真事件(76.1 对 60.3,平均偏置 +15.9)。这是倾向而非强弱:两个领先模型接近平衡,Opus 是极端例子(+38.0)。",
                        "Models are much better at denying false events than at confirming true ones (76.1 against 60.3, mean bias +15.9). It is a disposition rather than raw strength: the two leaders are near balanced, Opus is the extreme at +38.0."),
        },
        "cutoff_gradient": {
          "title": L("截止点梯度", "Cutoff gradient"),
          "subtitle": L("把每个事件的 25 个预测点按先后分成三档。","Each event's 25 prediction points split into early, middle and late terciles."),
          "rows": [
            {"label": L("早期","Early"),  "doubao": 63.4, "opus": 62.7, "gemini": 75.1, "gpt": 75.5, "mean": 66.7},
            {"label": L("中期","Middle"), "doubao": 66.1, "opus": 63.5, "gemini": 73.6, "gpt": 75.4, "mean": 67.6},
            {"label": L("后期","Late"),   "doubao": 66.6, "opus": 68.4, "gemini": 69.6, "gpt": 77.4, "mean": 68.7},
            {"label": L("梯度","Gradient"), "doubao": 3.2, "opus": 5.7, "gemini": -5.5, "gpt": 1.9, "mean": 2.0, "is_delta": True},
          ],
          "takeaway": L("越靠后的截止点看到的弧线越多,分数越高(66.7 → 67.6 → 68.7)。这是预测基准该有的'越近越容易'性质,也是对构造方式的一次基本合理性检查。",
                        "Later cutoffs see more of the arc and score higher (66.7 -> 67.6 -> 68.7). That is the closer-is-easier property a forecasting benchmark should show, and a basic sanity check on the construction."),
        },
      },
    }


# ----------------------------------------------------------------------------
# Blocks read from the frozen ablation files. Each one carries its own columns
# so the page does not need a hard-coded spec per table.
# ----------------------------------------------------------------------------
# The seven systems that ran every point in both languages. The foreign three
# only ran a cost-saving subset, so they stay out of the mean.
FULL7 = [("doubao-seed-2-0-pro-260215", "豆包", "Doubao"),
         ("kimi-k2.5", "kimi", "Kimi"),
         ("deepseek-v4-pro-guan", "deepseek", "DeepSeek"),
         ("mirofish__doubao-seed-2-0-pro-260215", "mirofish", "MiroFish"),
         ("langgraph__doubao-seed-2-0-pro-260215", "langgraph", "LangGraph"),
         ("autogen__doubao-seed-2-0-pro-260215", "autogen", "AutoGen"),
         ("grok-3-mini", "grok", "Grok-3-Mini")]
EVENTS5 = ["event1_library", "event2_trump_tariff", "event3_tiktok", "event4_us_iran", "event5_smci"]


def _details(mdir, langdir):
    """Per-question calibration log rows, pooled over the five events."""
    out = []
    for ev in EVENTS5:
        for f in sorted(glob.glob(f"{RUNS}/{ev}/final/{langdir}/results/run_main/brier/{mdir}/P*_brier.json")):
            for r in json.load(open(f, encoding="utf-8")).get("details") or []:
                if not isinstance(r, dict): continue
                if not r.get("valid_for_scoring", not r.get("parse_failed", False)): continue
                if r.get("prob") is None or r.get("mae") is None: continue
                out.append(r)
    return out


def _pooled(rows):
    """eval/ablation/ablation_qtype.py: 100 * (1 - weighted MAE), baseline 1.0."""
    w = sum(x.get("weight", 0) for x in rows)
    if w <= 0: return None
    return 100.0 * max(0.0, 1.0 - sum(x.get("mae", 0) * x.get("weight", 0) for x in rows) / w)


def block_dimension(zh, lang="中文"):
    """Which dimension of question is hardest: event / policy / opinion.

    Recomputed from the calibration logs rather than read from the frozen file:
    the frozen English block is empty because the script that wrote it filtered
    on the Chinese dimension labels. This is re-analysis of runs that already
    exist -- no model is called. The Chinese result is checked against the
    frozen values so any drift shows up here rather than on the page.
    """
    L = (lambda a, b: a if zh else b)
    dims = [("事件", "event", L("事件类", "Event")),
            ("政策", "policy", L("政策类", "Policy")),
            ("舆论", "opinion", L("舆论类", "Opinion"))]
    key = (lambda zhk, enk: zhk if lang == "中文" else enk)
    per, mean = {}, {}
    for mdir, slug, _disp in FULL7:
        det = _details(mdir, lang)
        if not det: return None
        per[slug] = {zhk: _pooled([x for x in det if x.get("dimension") == key(zhk, enk)])
                     for zhk, enk, _ in dims}
    for zhk, _enk, _ in dims:
        vals = [per[s][zhk] for _, s, _d in FULL7 if per[s][zhk] is not None]
        mean[zhk] = sum(vals) / len(vals) if vals else None

    frozen = ((abl("维度构成.json") or {}).get("中文") or {}).get("means_7家") or {}
    if lang == "中文":
        for zhk, _enk, _ in dims:
            if frozen.get(zhk) is not None and abs(mean[zhk] - frozen[zhk]) > 0.05:
                raise SystemExit(f"维度构成 复算与冻结值不符: {zhk} {mean[zhk]:.2f} vs {frozen[zhk]}")

    pick = [("豆包", "Doubao"), ("deepseek", "DeepSeek"), ("kimi", "Kimi"), ("mirofish", "MiroFish")]
    means = mean
    pm = per
    keys = [(zhk, lab) for zhk, _enk, lab in dims]
    rows = []
    for k, label in keys:
        row = {"label": label, "mean": r1(means.get(k))}
        for src, _ in pick: row[src] = r1((pm.get(src) or {}).get(k))
        rows.append(row)
    return {
        "title": L("题目维度", "Question dimension"),
        "subtitle": L("同一批作答按题目问的是什么重新分组:具体事件、政策动作、还是舆论走向。7 家全量模型。",
                      "The same answers regrouped by what the question asks about: a concrete event, a policy move, or where opinion goes. Seven full-coverage systems."),
        "columns": cols(("label", L("维度", "Dimension")), *[(s, n) for s, n in pick], ("mean", L("7 家均值", "Mean of 7"))),
        "rows": rows,
        "takeaway": L(f"舆论题最好答({r1(means.get('舆论'))}),具体事件最难({r1(means.get('事件'))})——模型对'风向往哪边吹'比对'某件事会不会发生'更有把握。",
                      f"Opinion questions are the easiest ({r1(means.get('舆论'))}) and concrete events the hardest ({r1(means.get('事件'))}): models read the direction of the wind better than they call a specific event."),
    }


def block_window(zh, lang="中文"):
    """Where in the 90-day window the temporal difficulty sits."""
    d = abl("题型构成_f窗口.json")
    if not d: return None
    blk = (d.get(lang) or {})
    means = blk.get("means_7家") or {}
    pm = blk.get("per_model", {})
    if not means: return None
    L = (lambda a, b: a if zh else b)
    pick = [("豆包", "Doubao"), ("kimi", "Kimi"), ("deepseek", "DeepSeek")]
    keys = [("仅段1_0-30", L("仅 0–30 天", "0-30 days only")),
            ("仅段2_31-60", L("仅 31–60 天", "31-60 days only")),
            ("仅段3_61-90", L("仅 61–90 天", "61-90 days only")),
            ("full", L("完整窗口(本文)", "Full window (ours)"))]
    rows = []
    for k, label in keys:
        row = {"label": label, "mean": r1(means.get(k)), "is_baseline": k == "full"}
        for src, _ in pick: row[src] = r1((pm.get(src) or {}).get(k))
        rows.append(row)
    share = means.get("_段占比%_7家均") or []
    sh = ("·".join(f"{s}%" for s in share)) if share else ""
    return {
        "title": L("时间窗口分段", "Window segments"),
        "subtitle": L(f"时间题按事件距截止日多远分成三段再单独计分。段内题量占比 {sh}。",
                      f"Temporal questions split by how far the event sits from the cutoff, then scored segment by segment. Segment shares: {sh}."),
        "columns": cols(("label", L("窗口段", "Segment")), *[(s, n) for s, n in pick], ("mean", L("7 家均值", "Mean of 7"))),
        "rows": rows,
        "takeaway": L(f"三段之间只差 {r1(means.get('最大摆动'))} 分,最难的是中段 31–60 天({r1(means.get('仅段2_31-60'))})——不是越远越难,而是中间那段最不好判断。",
                      f"The three segments differ by only {r1(means.get('最大摆动'))} points, and the hardest is the middle one, 31-60 days ({r1(means.get('仅段2_31-60'))}): distance alone does not drive difficulty."),
    }


def block_anonymization(zh, lang="中文"):
    """Does anonymization actually remove the memory signal? (DeepSeek, zh only.)"""
    d = abl("匿名化.json")
    if not d: return None
    blk = d.get("中文", {})
    per = blk.get("per_event", {})
    L = (lambda a, b: a if zh else b)
    names = [("武大", L("武大", "Wuhan Lib.")), ("关税", L("关税", "Trump Tariff")),
             ("TikTok", "TikTok"), ("美伊", L("美伊", "US-Iran")), ("SMCI", "SMCI")]
    rows = []
    for k, label in names:
        e = per.get(k) or {}
        b, f = e.get("B") or {}, e.get("F") or {}
        rows.append({"label": label,
                     "b_anon": r1(b.get("主版全匿名")), "b_plain": r1(b.get("plain全真")),
                     "f_anon": r1(f.get("主版全匿名")), "f_plain": r1(f.get("plain全真")),
                     "delta": r1(f.get("Δ记忆信号"))})
    dm = blk.get("Δ均") or {}
    rows.append({"label": L("五事件平均 Δ", "Mean delta over 5 events"),
                 "b_anon": None, "b_plain": r1(dm.get("B概率")),
                 "f_anon": None, "f_plain": r1(dm.get("F时间")),
                 "delta": r1(dm.get("F时间")), "is_baseline": True})
    return {
        "title": L("匿名化有效性", "Does anonymization work?"),
        "subtitle": L("同一个模型(DeepSeek)在同样的点上答两遍:一遍是主实验的全匿名版本,一遍是撤销替换、还原真名真日期的原文。",
                      "One model (DeepSeek) answers the same points twice: once on the anonymized version used in the main experiment, once on the original with real names and real dates restored."),
        "columns": cols(("label", L("事件", "Event")),
                        ("b_anon", L("概率·匿名", "Prob · anon")), ("b_plain", L("概率·真名", "Prob · real")),
                        ("f_anon", L("时间·匿名", "Time · anon")), ("f_plain", L("时间·真名", "Time · real")),
                        ("delta", L("时间轴记忆信号", "Memory signal, time"))),
        "rows": rows,
        "takeaway": L("概率轴几乎不动(均 +1.0)——判断题不靠记忆;时间轴还原真名后平均涨 4.9 分,关税 +6.8、TikTok +10.0、SMCI +9.2,而冷门的武大 −0.2、美伊 −1.3。模型确实记得住热门事件的时点,所以匿名化对时间轴是必要的,主实验也因此没被记忆污染。",
                      "The probability axis barely moves (+1.0 on average): those questions are not answered from memory. The temporal axis gains 4.9 points on average once real names are back - tariffs +6.8, TikTok +10.0, SMCI +9.2 - while the two low-profile arcs move -0.2 and -1.3. Models do remember when famous events happened, which is exactly why the temporal axis needs anonymization."),
    }


def block_web(zh, lang="中文"):
    """Live web access, held against the memory signal (Doubao, zh only)."""
    d = abl("联网_豆包.json")
    if not d: return None
    pairs = d.get("对照") or {}
    L = (lambda a, b: a if zh else b)
    names = {"event1-B": L("武大 · 概率", "Wuhan Lib. · prob"), "event1-F": L("武大 · 时间", "Wuhan Lib. · time"),
             "event2-B": L("关税 · 概率", "Trump Tariff · prob"), "event2-F": L("关税 · 时间", "Trump Tariff · time")}
    rows = []
    for k, label in names.items():
        e = pairs.get(k) or {}
        rows.append({"label": label, "nw": r1(e.get("不联网plain")), "web": r1(e.get("联网plain")),
                     "base": r1(e.get("全匿名基线")), "delta": r1(e.get("Δ联网(web-nw)"))})
    return {
        "title": L("联网检索", "Web access"),
        "subtitle": L("同一个模型(Doubao)在真名版本上答两遍:一遍彻底断网,一遍允许联网检索。两个事件、全部 25 个点。",
                      "One model (Doubao) answers the real-name version twice: once with the network off, once allowed to search. Two events, all 25 points."),
        "columns": cols(("label", L("事件 · 轴", "Event · axis")),
                        ("nw", L("断网", "No web")), ("web", L("联网", "With web")),
                        ("base", L("全匿名基线", "Anonymized baseline")), ("delta", L("Δ 联网", "Delta from web"))),
        "rows": rows,
        "takeaway": L("给它联网只涨 0.8–2.7 分(均约 +1.5)——能查到的资料帮不上多少忙,因为要预测的是截止日之后的事。断网的真名版对全匿名基线也没有稳定优势,说明 Doubao 对这两个事件没有记忆信号。",
                      "Search buys 0.8-2.7 points (about +1.5 on average): what can be retrieved does not help much, because the question is about what happens after the cutoff. The offline real-name run holds no steady edge over the anonymized baseline either, so this model carries no memory signal for these two arcs."),
    }


for zh, suf in ((False, ""), (True, ".zh")):
    d = build(zh)
    # The language toggle on the site is a translation, not a different set of
    # results -- the leaderboard already shows one set of numbers in both
    # languages. These blocks therefore always carry the main (Chinese-edition)
    # figures; only their labels are translated.
    for key, fn in (("anonymization", block_anonymization), ("dimension_mix", block_dimension),
                    ("window_segments", block_window), ("web_access", block_web)):
        blk = fn(zh)
        if blk: d["ablations"][key] = blk
    json.dump(d, open(f"{OUT}/experiments{suf}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  experiments{suf}.json  消融 {len(d['ablations'])} 组 / 压力事件 {len(d['stress_case']['events'])} 个")
