<div align="center">

# 🔮 SocietyBench — Web

反事实社会世界的演化预测
</br>
Forecasting Counterfactual Social-World Evolution

[![License](https://img.shields.io/badge/License-MIT-2a78d6?style=flat-square)](LICENSE)
[![Site](https://img.shields.io/badge/Site-static%20HTML-1baf7a?style=flat-square)](index.html)
[![Dataset](https://img.shields.io/badge/%F0%9F%A4%97%20Dataset-SocietyBench-eda100?style=flat-square)](https://huggingface.co/datasets/Social-AI-2026/SocietyBench)
[![Code](https://img.shields.io/badge/GitHub-SocietyBench--codebase-eb6834?style=flat-square&logo=github&logoColor=white)](https://github.com/Social-AI-2026/SocietyBench-codebase)
[![Pages](https://img.shields.io/badge/Pages-2-e87ba4?style=flat-square)](https://github.com/Social-AI-2026/SocietyBench-web)

[English](./README.md) | [中文文档](./README-ZH.md)

</div>

## ⚡ Overview

This repository is the **project page** for SocietyBench — the benchmark that asks whether a
language model can forecast how a real social event unfolds when it cannot tell which event it
is. The benchmark itself lives in two other repositories; this one only presents it.

The site is deliberately plain: static HTML, no build step, no framework, no bundler. Open
`index.html` and it runs. Everything that can change without touching markup — the
leaderboard, the interactive demo, the deep-dive tables, every string in both languages —
lives in JSON and in `i18n.js`.

> **Every number on the site is measured.** The leaderboard is the paper's Table 2, the
> deep-dive tables are the paper's ablation tables, and the demo replays our real per-question
> model outputs. There are no projected or illustrative figures anywhere.

## 🎯 The two pages

| Page | What it shows |
|------|---------------|
| **`index.html`** | Overview, abstract, method, leaderboard, deep-dive, contribute, citation |
| **`demo.html`** | *Try it* — pick an event and a cutoff, see what the model saw, what it answered, and how far off it was |

Both share one nav bar, one stylesheet and one translation table, so a change to any of those
lands on every page at once. The deep-dive used to be a third page; it is now a section of the
homepage, right after the leaderboard.

## 🔄 How the data flows

1. **Experiments** — the pipeline in
   [SocietyBench-codebase](https://github.com/Social-AI-2026/SocietyBench-codebase) writes
   per-question outputs under `runs_new/<event>/final/<lang>/results/run_main/`
2. **Generation** — `_gen/build_site_data.py` and `_gen/build_experiments.py` read those
   outputs and the paper's tables, and emit the six JSON files below
3. **Rendering** — `app.js` draws the leaderboard and the deep-dive, `demo.js` drives the
   interactive page, `i18n.js` swaps every string between English and Chinese
4. **Serving** — no build step; the files are served exactly as they sit in this repository

## 🚀 Quick start

### Prerequisites

| Tool | Version | Purpose | Check |
|------|---------|---------|-------|
| **Any static server** | — | serving the files locally | `python3 -m http.server --help` |
| **Python** | 3.10+ | only to regenerate the data files | `python3 --version` |
| **ffmpeg** | any | only to re-encode the videos | `ffmpeg -version` |

#### 1. Run it locally

```bash
git clone https://github.com/Social-AI-2026/SocietyBench-web
cd SocietyBench-web

python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` straight off the filesystem also
works for the layout, but the `fetch()` calls that load the JSON are blocked by the browser's
file-origin rules, so the leaderboard and the demo stay empty. Use the server.

> **The homepage is behind a password gate.** It is a private preview: the page holds a
> SHA-256 hash and unlocks in the browser, so it keeps the page out of casual view but is not
> real access control. Remove the `#auth-gate` block from `index.html` to publish openly.

#### 2. Regenerate the data

Only needed after a new experiment run or a change to the paper's tables:

```bash
python3 _gen/build_site_data.py     # leaderboard + interactive demo, both languages
python3 _gen/build_experiments.py   # stress cases + the four ablations, both languages
```

The first script reads the real run outputs; the second transcribes the paper's tables. Both
write straight into this directory and print what they produced.

#### 3. Re-encode the videos

The source clip is 2560×1440 at 27 Mbps, far past GitHub's 100 MB per-file limit. Two
derivatives are committed instead:

```bash
# hero background: muted, looping, light
ffmpeg -i source.mp4 -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 30 \
       -pix_fmt yuv420p -movflags +faststart -an videos/hero.mp4

# abstract player: windowed, with sound
ffmpeg -i source.mp4 -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 27 \
       -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k videos/abstract-demo.mp4
```

Bump the `?v=` query on the `<source>` tags in `index.html` afterwards, or browsers will keep
serving the cached copy.

## 🏗️ Project structure

| Path | Contents |
|------|----------|
| `index.html` · `demo.html` | The two pages |
| `styles.css` | One stylesheet for all of them |
| `app.js` | Leaderboard, deep-dive tables, nav, reveal animations |
| `demo.js` | The interactive page (live mode is wired but off in this build) |
| `i18n.js` | Every user-visible string, English and Chinese |
| `leaderboard.json` · `.zh.json` | The paper's Table 2, plus agents and baselines |
| `demo_index.json` · `.zh.json` | Cached mode — the list of events and prediction points |
| `demo/<lang>/<event>/P<NN>.json` | One file per prediction point: every question, every answer |
| `experiments.json` · `.zh.json` | Stress cases and the four in-text ablations |
| `figures/` | Teaser and method figures from the paper |
| `videos/` | `hero.mp4` (background) and `abstract-demo.mp4` (player) |
| `_gen/` | The two generators that produce the JSON |

> `uploads/` is gitignored. It holds the design tool's scratch — pasted screenshots, source
> videos, PDFs — which no page references and which would add ~88 MB to every clone.

## 📚 Documentation

| Document | What it answers |
|----------|-----------------|
| [`HANDOFF.md`](HANDOFF.md) | How the page is wired: layout classes, the reveal system, how a section is added |
| [`_gen/build_site_data.py`](_gen/build_site_data.py) | Which run outputs become the leaderboard and the demo, and how points are chosen |
| [`_gen/build_experiments.py`](_gen/build_experiments.py) | Which paper table becomes which deep-dive block |
| [`i18n.js`](i18n.js) | Every user-visible string; the key naming scheme is documented at the top |
| [Methodology](https://github.com/Social-AI-2026/SocietyBench-codebase/blob/main/docs/methodology.md) | The benchmark itself — framework, anonymization, the two axes |
| [Scoring](https://github.com/Social-AI-2026/SocietyBench-codebase/blob/main/docs/scoring.md) | The exact calibration and temporal formulas the numbers come from |

## 💾 Data

Everything on the page is generated, never hand-edited.

| File | Rows | Source |
|------|------|--------|
| `leaderboard.json` · `.zh.json` | 6 LLMs + 3 agents | the paper's Table 2 and agent table |
| `demo_index.json` · `.zh.json` | 5 events, 125 prediction points | our real per-question run outputs |
| `demo/<lang>/<event>/P<NN>.json` | 25,364 calibration questions + 3,112 temporal events | the same run outputs, one file per point |
| `experiments.json` · `.zh.json` | the three difficulty ablations | the paper's ablation tables |

Both exams are released whole: every question of every prediction point, not a
sample. That is 250 point files and ~14 MB, so the page loads the index first and
fetches a point's questions when it is picked.

**Cached mode is not a mock-up.** For each prediction point the demo shows the real cutoff
date, the real context the model was given, one real calibration question with its real
answer, and what each of the six models actually returned:

| Field | Where it comes from |
|-------|---------------------|
| `p_hat` | the model's own probability, from `brier/<model>/P<NN>_brier.json` |
| `pred_date` · `abs_error_days` | the model's own date, from `time/<model>/P<NN>_time.json` |
| `context_excerpt` | the released `contexts/P<NN>_context.md` |
| `gt` · `gt_date` | the held-out ground truth |

All 125 prediction points are offered, and every question under them. Coverage is uneven and
the page says so rather than hiding it: the three foreign models ran a cost-saving subset on
four of the five events, so a point may carry fewer than six models — the point selector says
how many — and a model that skipped a question shows "—" instead of a number. Temporal events
beyond the 90-day scoring window were never put to a model; they are listed and marked *not
scored*. Live mode — calling a model API at request time — is not part of this build: the
pane is gone from the page and the code that drives it no-ops.

The anonymized timelines and question banks themselves live at
[🤗 Social-AI-2026/SocietyBench](https://huggingface.co/datasets/Social-AI-2026/SocietyBench).

## 🤝 Contributing

Corrections to the site are welcome. Two things to keep in mind: numbers on the page come
from the generators, not from hand-editing the JSON, and any string a visitor can read has to
exist in both languages in `i18n.js`.

Never commit an entity replacement table, a real-name variant, or a true date offset. The
benchmark only works while those stay private — see the security policy in
[SocietyBench-codebase](https://github.com/Social-AI-2026/SocietyBench-codebase).

## 📄 Citation

```bibtex
@misc{societybench2026,
  title  = {SocietyBench: Forecasting Counterfactual Social-World Evolution},
  author = {Wang, Zhenran and Bian, Zhonghan and Li, Jinsong and Qi, Zhangyang},
  year   = {2026},
  note   = {\url{https://github.com/Social-AI-2026/SocietyBench-codebase}}
}
```

## 🙏 Acknowledgements

The MiroFish agent baseline shown on the leaderboard is built on
**[MiroFish](https://github.com/666ghj/MiroFish)**, whose simulation engine runs on
**[OASIS](https://github.com/camel-ai/oasis)** by CAMEL-AI. The other two agent baselines use
**[LangGraph](https://github.com/langchain-ai/langgraph)** and
**[AutoGen](https://github.com/microsoft/autogen)**.

## ⚖️ License

Site code under the [MIT License](LICENSE). The benchmark data is released separately under
CC BY 4.0, and the pipeline under MIT.
