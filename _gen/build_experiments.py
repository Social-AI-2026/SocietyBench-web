#!/usr/bin/env python3
"""Rebuild experiments.json from the paper's own ablation and stress-case tables."""
import json
OUT = "/home/ubuntu/societybench_web/site"

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
          {"event": "SMCI", "points": 25, "arc_days": 468, "n_cal": 3196, "n_time": 528,
           "mean": {"cal": 65.7, "time": 70.5}, "gpt": {"cal": 74.9, "time": 84.2},
           "kimi": {"cal": 64.8, "time": 64.9},
           "gap": {"cal": 10.1, "cal_pct": 16, "time": 19.3, "time_pct": 30}},
          {"event": "Trump Tariff", "points": 25, "arc_days": 2930, "n_cal": 8035, "n_time": 976,
           "mean": {"cal": 72.9, "time": 71.9}, "gpt": {"cal": 81.7, "time": 85.4},
           "kimi": {"cal": 66.4, "time": 64.0},
           "gap": {"cal": 15.3, "cal_pct": 23, "time": 21.4, "time_pct": 33}},
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

for zh, suf in ((False, ""), (True, ".zh")):
    d = build(zh)
    json.dump(d, open(f"{OUT}/experiments{suf}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  experiments{suf}.json  消融 {len(d['ablations'])} 组 / 压力事件 {len(d['stress_case']['events'])} 个")
