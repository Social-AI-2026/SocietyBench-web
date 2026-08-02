/* =============================================================================
 * i18n.js — SocietyBench bilingual (EN / 中文) runtime
 *
 * How it works:
 *   1. Static HTML strings are tagged with one of:
 *        data-i18n="some.key"        → replaces textContent
 *        data-i18n-html="some.key"   → replaces innerHTML (use sparingly, only
 *                                       when the string itself contains markup
 *                                       like <strong> / <em>)
 *        data-i18n-attr="placeholder:auth.placeholder,title:nav.foo"
 *                                     → sets one or more attributes
 *   2. Dynamic strings emitted by app.js call t('some.key').
 *   3. When the user toggles the language, applyLang() rewrites every tagged
 *      element AND dispatches a `sb:langchange` event so app.js can re-render
 *      dynamic content (leaderboard, deep-dive, try-mode, etc.).
 *
 * Default language: EN (paper is an English NeurIPS submission).
 * Persistence: localStorage key `sb_lang`.
 * Lookup fallback: missing zh key falls back to en, missing en key is left as-is.
 * ========================================================================== */

(function () {
  'use strict';

  // -------- Dictionary ------------------------------------------------------
  const I18N = {
    en: {
      // Language toggle labels
      'lang.en': 'EN',
      'lang.zh': '中',
      'lang.toggle.title': 'Switch language',

      // ---- Auth gate ------------------------------------------------------
      'auth.brand': 'SOCIETYBENCH',
      'auth.title': 'PRIVATE PREVIEW',
      'auth.sub': 'Project page in development. Enter the access password to continue.',
      'auth.placeholder': 'Password',
      'auth.btn': '▸ UNLOCK',
      'auth.err': 'Wrong password.',

      // ---- Sidebar --------------------------------------------------------
      'nav.brand': 'SOCIETYBENCH',
      'nav.ver': 'V0.1',
      'nav.group.start': 'START',
      'nav.overview': 'Overview',
      'nav.group.benchmark': 'BENCHMARK',
      'nav.method': 'Method',
      'nav.try': 'Try it ★',
      'nav.contribute': 'Contribute',
      'nav.group.results': 'RESULTS',
      'nav.leaderboard': 'Leaderboard',
      'nav.deepdive': 'Deep-dive',
      'nav.qualitative': 'Qualitative',
      'nav.group.about': 'ABOUT',
      'nav.limitations': 'Limitations',
      'nav.cite': 'Citation',
      'nav.external.paper': 'Paper (PDF)',
      'nav.external.arxiv': 'arXiv',
      'nav.external.code': 'Code',
      'nav.external.dataset': 'Dataset',
      'nav.external.video': 'Video',
      'nav.footer.blind': 'ANONYMOUS',
      'nav.footer.license': 'DATA: CC-BY-NC 4.0 · CODE: MIT',

      // ---- Mobile bar -----------------------------------------------------
      'mb.brand': 'SOCIETYBENCH',
      'mb.toggle': '▤ MENU',

      // ---- Page header (breadcrumb + quick buttons) -----------------------
      'ph.crumb.root': 'SOCIETYBENCH',
      'ph.crumb.overview': 'OVERVIEW',
      'ph.crumb.method': 'METHOD',
      'ph.crumb.try': 'TRY IT',
      'ph.crumb.contribute': 'CONTRIBUTE',
      'ph.crumb.leaderboard': 'LEADERBOARD',
      'ph.crumb.deepdive': 'DEEP-DIVE',
      'ph.crumb.qualitative': 'QUALITATIVE',
      'ph.crumb.limitations': 'LIMITATIONS',
      'ph.crumb.cite': 'CITATION',
      'ph.tag.version': 'V0.1',
      'ph.tag.blind': 'ANONYMOUS',
      'ph.btn.paper': '▸ Paper',
      'ph.btn.arxiv': '▸ arXiv',
      'ph.btn.code': '▸ Code',
      'ph.btn.bibtex': '▸ BibTeX',

      // ---- Hero -----------------------------------------------------------
      'hero.title': 'Society-Bench',
      'hero.title.main': 'SocietyBench',
      'hero.title.sub.lead': 'Forecasting',
      'hero.title.sub.accent': 'Counterfactual Social-World',
      'hero.title.sub.tail': 'Evolution',
      'hero.badge': 'Private preview · v0.1 · Anonymous review',
      'hero.pitch': 'Can Language Models Forecast Real-World Social Events?',
      'hero.pitch.long': 'The first benchmark capable of measuring whether language models can forecast real-world social events — using anonymized ground truth distilled from Web news and five social-media platforms.',
      'hero.btn.paper': 'Paper',
      'hero.btn.leaderboard': 'See Leaderboard',
      'hero.btn.arxiv': 'arXiv',
      'hero.btn.code': 'Code',
      'hero.btn.dataset': 'Dataset',
      'hero.btn.dataset.badge': 'SOON',
      'hero.btn.video': 'Video',
      'hero.btn.bibtex': 'BibTeX',

      // ---- Abstract -------------------------------------------------------
      'about.title': 'Abstract',
      'about.p1': 'We present the first benchmark capable of measuring the ability to forecast real-world social events using anonymized ground truth from Web news and social-media.',
      'about.p2.html': 'Our approach collects Web news and social-media posts across five platforms, distills each source into date-indexed timelines via a six-step agent-driven processing chain, and merges them into a unified chronology that separates factual events from public opinion. We apply an anonymization procedure that renders each real event arc into a <strong>counterfactual social world</strong>, ensuring the evaluation measures forecasting ability rather than the ability to search for the real event. We then automatically generate an agent-audited question bank supporting two orthogonal evaluation axes: probability calibration and temporal accuracy.',
      'about.p3': 'SocietyBench turns any one-line event topic into an anonymized simulated social world, and uses an agent-audited question bank to evaluate LLMs along two axes — probability calibration and temporal accuracy.',

      // ---- Key Contributions ---------------------------------------------
      'contrib.title': 'Key Contributions',
      'contrib.c01.num': '01',
      'contrib.c01.title': 'Counterfactual Anonymization',
      'contrib.c01.body.html': 'Three-phase entity-and-date anonymization (rule replacement → LLM adversarial audit loop, ≤ 5 rounds, stops at <strong>high = 0</strong> and <strong>mid = 0</strong> → consistency check). Renders each real arc into a deidentified counterfactual world — structurally identical, stripped of pre-training-matchable surface labels.',
      'contrib.c02.num': '02',
      'contrib.c02.title': 'Dual-Axis Scoring',
      'contrib.c02.body.html': 'Two orthogonal 0–100 scores per event: <strong>Calibration</strong> (weighted MAE against binary ground truth; a uniform 50% predictor scores exactly 50) and <strong>Temporal accuracy</strong> (day-MAE vs. a 30-day bucket-midpoint baseline). A model can be well-calibrated but date-blind, or vice versa; both are reported.',
      'contrib.c03.num': '03',
      'contrib.c03.title': 'Dual-Source Timelines',
      'contrib.c03.body.html': 'Per event, the pipeline collects in parallel Web news + five social-media platforms, and merges them into a unified chronology that explicitly separates <strong>factual events</strong> from a <strong>public-opinion layer</strong> — measuring social dynamics, not just news facts.',

      // ---- Method --------------------------------------------------------
      'method.title': 'Method',

      // Four-phase pipeline
      'method.4phase.title': 'Four-Phase Pipeline',
      'method.4phase.intro': 'Our benchmark operates through a four-phase pipeline: collecting multi-source data, distilling timelines, merging and anonymizing them into counterfactual worlds, and evaluating models on probability calibration and temporal accuracy.',
      'method.4phase.th1': 'Phase',
      'method.4phase.th2': 'What it does',
      'method.4phase.p00.num': '00',
      'method.4phase.p00.name': 'Collection',
      'method.4phase.p00.desc': 'Collects Web news and social-media posts across five platforms',
      'method.4phase.p01.num': '01',
      'method.4phase.p01.name': 'Per-source',
      'method.4phase.p01.desc': 'Distills each source into date-indexed timelines',
      'method.4phase.p02.num': '02',
      'method.4phase.p02.name': 'Merge',
      'method.4phase.p02.desc': 'Merges streams into unified chronology separating facts from opinion',
      'method.4phase.p03.num': '03',
      'method.4phase.p03.name': 'Evaluation',
      'method.4phase.p03.desc': 'Anonymizes, generates questions, and scores on two axes',

      // Three-phase anonymization
      'method.3anon.title': 'Three-Phase Anonymization',
      'method.3anon.intro.html': 'The anonymization pipeline renders each merged timeline into a counterfactual world before any candidate model sees it. The auditor loop stops at <strong>high = 0 and mid = 0</strong>, max 5 rounds.',
      'method.3anon.p01.num': '01',
      'method.3anon.p01.title': 'Rule-based Replacement',
      'method.3anon.p01.body': 'Swap every entity against a table, then slide all dates by one shared offset — the gaps survive, the calendar does not.',
      'method.3anon.p02.num': '02',
      'method.3anon.p02.title': 'LLM Adversarial Audit Loop',
      'method.3anon.p02.body.html': 'An auditor LLM hunts for anything still searchable; whatever it finds becomes a new rule and Phase 01 re-runs.',
      'method.3anon.p03.num': '03',
      'method.3anon.p03.title': 'Consistency Check',
      'method.3anon.p03.body': 'Compare the result against the original and repair what the swaps broke.',

      // Dual-axis evaluation
      'method.dual.title': 'Dual-Axis Evaluation',
      'method.dual.intro': 'At each accepted prediction point, the candidate sees the context up to a cutoff date and answers two orthogonal question types.',
      'method.dual.a1.tag': 'AXIS 01 — CALIBRATION',
      'method.dual.a1.title': 'Probability Calibration.',
      'method.dual.a1.metric.html': 'For an event E in a time window W, the model outputs P(E occurs in W) ∈ [0,1]. Scored by <strong>weighted MAE</strong> against binary ground truth.',
      'method.dual.a1.scale.0.html': '<b>50</b> uniform 50% predictor',
      'method.dual.a1.scale.100.html': '<b>100</b> perfect predictor',
      'method.dual.a2.tag': 'AXIS 02 — TEMPORAL',
      'method.dual.a2.title': 'Temporal Accuracy.',
      'method.dual.a2.metric.html': 'For each in-window event, predict its calendar date. Scored by <strong>day-MAE</strong> against a 30-day bucket-midpoint baseline.',
      'method.dual.a2.scale.50.html': '<b>50</b> bucket-midpoint baseline',
      'method.dual.a2.scale.100.html': '<b>100</b> perfect timing',

      // ---- Events covered ------------------------------------------------
      'events.title': 'Events Covered',
      'events.c01.num': '01',
      'events.c01.title': 'Public Controversy',
      'events.c01.body': 'Online dispute at a major university.',
      'events.c01.pts': '[ 26 PTS ]',
      'events.c02.num': '02',
      'events.c02.title': 'Trade Policy',
      'events.c02.body': 'Reciprocal-tariff escalation between two major economies.',
      'events.c02.pts': '[ 25 PTS ]',
      'events.c03.num': '03',
      'events.c03.title': 'Technology Policy',
      'events.c03.body': 'National divestiture / ban ruling on an online platform.',
      'events.c03.pts': '[ 20 PTS ]',
      'events.c04.num': '04',
      'events.c04.title': 'Geopolitical Conflict',
      'events.c04.body': 'Cross-border military confrontation between two states.',
      'events.c04.pts': '[ 30 PTS ]',
      'events.c05.num': '05',
      'events.c05.title': 'Financial Markets',
      'events.c05.body': 'Delisting crisis of an exchange-listed firm.',
      'events.c05.pts': '[ 11 PTS ]',

      // ---- Leaderboard ---------------------------------------------------
      'lb.title': 'Leaderboard',
      'lb.stamp.refreshed': 'DATA REFRESHED',
      'lb.stamp.nextreview': 'NEXT REVIEW',
      'lb.stamp.schema': 'SCHEMA',
      'lb.caption.html': 'Want your model on this table? &nbsp;→&nbsp; see <a href="#expand">EXPAND THE BENCHMARK</a> below.',

      'lb.tab.models': '[ MODELS ]',
      'lb.tab.bars': '[ BARS ]',
      'lb.tab.events': '[ EVENTS ]',
      'lb.tab.contributors.html': '[ CONTRIBUTORS ] <span style="font-size:9px;letter-spacing:0.18em;background:var(--ink);color:var(--orange);padding:2px 5px;margin-left:6px;">SOON</span>',
      'lb.tab.contributors.title': 'Coming soon — populated as community contributions land.',

      'lb.callout.html': '★ The strongest of six frontier LLMs reaches only <span class="big">75.0 / 100</span> overall, against a trivial anchor of 50 — about half the headroom remains.',
      'lb.loading': 'Loading…',
      'lb.note.dagger.html': '<span class="sym">†</span> Agents run on the <em>Doubao-Seed-2.0-Pro</em> base model; the delta against that base is what the row is measuring.',
      'lb.note.star.html': '<span class="sym">★</span> The two model-free baselines emit no dates, so their temporal score is recorded at the bucket-midpoint anchor of 50.',
      'lb.note.legend.html': 'Per-event cells: <code>Cal | Time</code>. Higher is better; 100 = perfect, 50 = the trivial anchor (a uniform 50% predictor on calibration, a bucket-midpoint guesser on time). Per-event labels: PUB = Public Controversy · GEO = Geopolitical · TECH = Tech Policy · MKT = Markets · TRADE = Trade. Every score on this table is measured — this release contains no projected numbers.',

      // Bars tab — toolbar controls
      'lb.bars.ctrl.event': 'Event',
      'lb.bars.btn.overall': 'Overall',
      'lb.bars.btn.pub': 'PUB',
      'lb.bars.btn.geo': 'GEO',
      'lb.bars.btn.tech': 'TECH',
      'lb.bars.btn.mkt': 'MKT',
      'lb.bars.btn.trade': 'TRADE',
      'lb.bars.ctrl.axis': 'Axis',
      'lb.bars.btn.cal': 'Cal',
      'lb.bars.btn.time': 'Time',
      'lb.bars.ctrl.sort': 'Sort',
      'lb.bars.btn.sort.score.html': 'Score <span class="arr">↓</span>',
      'lb.bars.btn.sort.name.html': 'Name <span class="arr">A→Z</span>',
      'lb.bars.ctrl.include': 'Include',
      'lb.bars.btn.validated': 'Validated',
      'lb.bars.btn.projected': '+ Projected',
      'lb.bars.btn.baselines': '+ Baselines',

      // Bars tab — legend
      'lb.bars.legend.best': 'Best in selection',
      'lb.bars.legend.llm': 'Validated LLM',
      'lb.bars.legend.proj': 'Projected',
      'lb.bars.legend.ref': 'Baseline',
      'lb.bars.legend.baseline-mark': 'Baseline tick',

      // Events tab inside leaderboard
      'lb.events.intro': 'Five anonymized arcs. Each card shows the arc description, prediction-point count, and the question volume that point supplies to the bank.',
      'lb.events.footer.html': '▸ More events expected via community contributions — see <a href="#expand" style="color: var(--orange-ink); border-bottom: 2px solid var(--orange); text-decoration: none; font-weight: 700;">EXPAND THE BENCHMARK</a>.',

      // ---- Try the Benchmark ---------------------------------------------
      'try.title.html': 'Try the Benchmark <span style="color: var(--orange);">★</span>',
      'try.note.anon.label': 'ANONYMIZED',
'try.subtitle': 'Pick an anonymized event and a prediction point. See exactly what a model sees, what it outputs, and how it compares to the ground truth.',
      'try.tab.cached': '[ CACHED MODE ]',
      'try.tab.live': '[ LIVE MODE ]',

      // Cached mode
      'try.cached.controls.label': '▸ CONTROLS',
      'try.ctx.expand': '▾ SHOW FULL CONTEXT',
      'try.ctx.open': '▸ READ THE FULL CONTEXT',
      'try.ctx.modal.title': 'FULL CONTEXT — UP TO CUTOFF',
      'try.ctx.loading': 'loading…',
      'try.anon.note': 'Anonymized: entities are replaced and every date is shifted by one shared offset, so the names and the calendar here do not match the real world. The ground truth on this page sits on the same shifted timeline.',
      'try.ctx.collapse': '▴ COLLAPSE',
      'try.field.event': 'EVENT',
      'try.field.point': 'PREDICTION POINT',
      'try.field.model': 'MODEL',
      'try.view.ctx.html': 'CONTEXT (UP TO CUTOFF) — <span class="meta" id="ctx-meta">—</span>',
      'try.view.cal-q': 'CALIBRATION',
      'try.view.time-q': 'TEMPORAL',
      'try.view.model-output.html': 'MODEL OUTPUT — <span class="meta" id="mout-name">—</span>',
      'try.view.phat-label': 'P̂  ·  CALIBRATION',
      'try.view.dhat-label': 'D̂  ·  TEMPORAL DAY',
      'try.view.gt': 'GROUND TRUTH',
      'try.btn.reveal-gt.html': '<span class="glyph">▸</span> REVEAL GT',
      'try.gt-pending': '— click to compare model output against the true outcome',
      'try.gv.cal.html': 'CALIBRATION GT &nbsp;·&nbsp; <b id="gt-cal">—</b> <span style="color:var(--muted)" id="gt-cal-note"></span>',
      'try.gv.time.html': 'TEMPORAL GT &nbsp;·&nbsp; <b id="gt-time">—</b>',
      'try.view.verdict': 'VERDICT',

      // Live mode
      'try.live.banner.html': '<span class="dot"></span>LIVE MODE — calls a real model API via <code style="margin: 0 4px;">/api/predict</code>. Daily budget applies.',
      'try.live.controls.label': '▸ CONTROLS · LIVE',
      'try.live.preview-gt-btn.html': '<span class="pv-glyph">▸</span> PREVIEW GT FOR THIS POINT',
      'try.live.pgt.cal': 'CAL GT',
      'try.live.pgt.time': 'TIME GT',
      'try.live.pgt.hint': '▸ The widget hides GT from the model cards until you click REVEAL GT. This preview is for the operator only.',
      'try.live.q-field': 'QUESTION (PICK ONE OR WRITE YOUR OWN)',
      'try.live.custom-q.or.html': '<span class="cq-or">— or write your own —</span>',
      'try.live.custom-q.placeholder': 'Type a custom calibration question (yes/no within a time window) or temporal question (predict a calendar day). The /api/predict backend will receive {question_id: \'custom\', question_text: \'…\'}.',
      'try.live.cq.cal': 'CAL',
      'try.live.cq.time': 'TIME',
      'try.live.cq.hint': 'Typing here clears the preset selection above.',
      'try.live.models-field': 'MODELS — SIDE BY SIDE',
      'try.live.model-a.label.html': '<span class="side-tag">A</span>MODEL A',
      'try.live.model-b.label.html': '<span class="side-tag b">B</span>MODEL B',
      'try.live.run-btn': '▶ RUN PREDICTION',
      'try.live.budget': 'Daily budget',
      'try.live.ctx.html': 'CONTEXT (UP TO CUTOFF) — <span class="meta" id="live-ctx-meta">—</span>',
      'try.live.result.label.html': 'RESULT — <span class="meta" id="live-result-meta">awaiting run</span>',
      'try.live.result.awaiting': 'awaiting run',
      'try.live.lc.name.a': 'Model A',
      'try.live.lc.name.b': 'Model B',
      'try.live.lc.num-label.before-run': 'Pick a question and 2 models, then hit RUN ▶ to call the live API',
      'try.live.lc.reason.before-run': 'Each Run calls the model API in real time (~5–30s). Daily budget applies.',
      'try.live.reveal-btn.html': '<span class="glyph">▸</span> REVEAL GT',

      // ---- Contribute (participate) section ------------------------------
      'cb.title': 'Contribute',
      'cb.subtitle': 'Everything you submit is reviewed and added to the public leaderboard.',

      'cb.c1.num': '01',
      'cb.c1.title': 'Bring Your Model',
      'cb.c1.body': 'Run our 5 events on your LLM or agent, submit your scorecard via PR. The team replays your raw answers with our scoring code — no honor system.',
      'cb.c1.action': 'Submission guide →',
      'cb.c1.drawer-toggle': '[ SHOW SUBMISSION DETAILS ▾ ]',
      'cb.c1.drawer.html':
`WHAT TO SUBMIT  <span class="dim">(place in submissions/&lt;your-name&gt;/&lt;model-name&gt;/)</span>
  <span class="kw">▸</span> model_card.md         <span class="dim">— name, version, params, training cutoff</span>
  <span class="kw">▸</span> predictions.jsonl     <span class="dim">— one line per question: {point_id, q_id, p_hat or d_hat}</span>
  <span class="kw">▸</span> run_metadata.json     <span class="dim">— reasoning depth, decoding params, API provider, dates</span>
  <span class="kw">▸</span> scorecard.json        <span class="dim">— scores computed by /eval/predict_step4_scorecard.py</span>

PROCESS
  <span class="kw">01</span>  Clone the repo, read README quickstart
  <span class="kw">02</span>  Run \`python main.py --model &lt;your-model&gt; --workspace ./run_&lt;your-model&gt;\`
  <span class="kw">03</span>  Verify your scorecard matches what the script computed
  <span class="kw">04</span>  Open a PR with the four files above

The team replays your raw answers with our official scoring code.
Match → added to the leaderboard. No honor system.`,
      'cb.c1.drawer-cta': '[ OPEN PR ON GITHUB → ]',

      'cb.c2.num': '02',
      'cb.c2.title': 'Bring a New Event',
      'cb.c2.body': 'Use our public pipeline (web-crawl → media-crawl → merge → anonymize → questionbank) to construct a new anonymized event. Submit it via PR; if accepted it joins the official 5+.',
      'cb.c2.action': 'Pipeline guide →',
      'cb.c2.drawer-toggle': '[ SHOW SUBMISSION DETAILS ▾ ]',
      'cb.c2.drawer.html':
`WHAT TO SUBMIT  <span class="dim">(place in submissions/&lt;your-name&gt;/event-&lt;slug&gt;/)</span>
  <span class="kw">▸</span> event_meta.json       <span class="dim">— slug, domain, arc dates, source platforms</span>
  <span class="kw">▸</span> timeline_anon.md      <span class="dim">— final anonymized timeline</span>
  <span class="kw">▸</span> replacements.json     <span class="dim">— substitution table (for audit)</span>
  <span class="kw">▸</span> questionbank/*.json   <span class="dim">— per prediction point</span>
  <span class="kw">▸</span> gt/*.md               <span class="dim">— per prediction point</span>
  <span class="kw">▸</span> audit_report.json     <span class="dim">— Phase 2 must show high=0 and mid=0</span>

PROCESS
  <span class="kw">01</span>  Use \`eval/total_pipeline.py\` to crawl + process + anonymize your event
  <span class="kw">02</span>  Verify the anonymization audit converges (high=0, mid=0)
  <span class="kw">03</span>  Open a PR adding the event folder

Accepted events join the official catalog and ship in the next benchmark version.`,
      'cb.c2.drawer-cta': '[ OPEN PR ON GITHUB → ]',

      'cb.c3.num': '03',
      'cb.c3.title': 'Suggest a Topic',
      'cb.c3.body': 'Have an event idea but no compute? Send us the topic and rough timespan. We\'ll run the pipeline on accepted suggestions and credit you on the contributor list.',
      'cb.c3.action': 'Submit topic →',

      // Suggest-topic form
      'cb.sf.name.label': 'Event name / one-line topic',
      'cb.sf.name.placeholder': 'e.g. Cross-border data-localization policy rollout',
      'cb.sf.from.label': 'Rough start',
      'cb.sf.from.placeholder': 'YYYY-MM',
      'cb.sf.to.label': 'Rough end',
      'cb.sf.to.placeholder': 'YYYY-MM',
      'cb.sf.email.label': 'Your email',
      'cb.sf.email.placeholder': 'you@domain',
      'cb.sf.why.label': 'Why this event (2–3 lines)',
      'cb.sf.why.placeholder': 'What makes this event a worthwhile addition? Domain coverage? Failure mode for current models?',
      'cb.sf.submit': '▸ SUBMIT TOPIC',

      // Bottom lines
      'cb.expand-note.html': 'Contributors and event-growth statistics will appear here as the benchmark grows · current: <strong>5 events</strong> · <strong>125 prediction points</strong> · <strong>9 systems</strong> on the leaderboard',
      'cb.discussions.html': 'Questions about format, methodology, or scoring? &nbsp;→&nbsp; Join the discussion on <a href="#">GitHub Discussions ↗</a>',

      // ---- Deep dive (intro only; tables rendered by app.js) -------------
      'dd.title': 'Deep Dive',
      'dd.validity.title': 'Does anonymization actually work?',
      'dd.validity.lede': 'Cross-event calibration score with each anonymization stage switched off. If the benchmark were measuring recall rather than forecasting, removing the disguise would make models look better — and it does.',
      'dd.validity.conclusion': 'Running on raw, un-anonymized event names inflates the mean by {gap} points. That gap is memory, not foresight: a measurable share of questions become answerable by recognising the real event instead of reasoning forward from it.',
      'dd.validity.more': 'Full per-event breakdown and the audit protocol are in §4.2 of the paper.',
      'dd.intro': 'Where the difficulty actually sits. The same answers regrouped four ways: by whether the truth is yes or no, by how late the cutoff is, by how far the event falls from it, and by what the question asks about.',

      // ---- Qualitative ---------------------------------------------------
      'qual.title': 'Qualitative',
      'qual.intro': 'A single anonymized geopolitical prediction point (Day 22 cutoff). The same point queried twice — once for calibration probability, once for temporal date — across four candidates: the strongest LLM, two LLMs that bracket the dominant failure modes (near-term over-extension, uniform-collapse), and the strongest projected agent setup.',
      'qual.q1.label': '▸ STRONGEST LLM  ·  CALIBRATED',
      'qual.q1.text': 'Naval drill positioning combined with escalating rhetoric across Days 22–29 indicates intent; absence of public de-escalation channels makes a kinetic response within 14 days likely.',
      'qual.q1.meta': 'P̂ = 0.78  ·  GT: strike occurred Day 31 (within window)  ·  CALIBRATED',
      'qual.q2.label': '▸ WEAK LLM  ·  UNIFORM COLLAPSE',
      'qual.q2.text': 'Signals point in opposing directions; insufficient basis to deviate from the prior.',
      'qual.q2.meta': 'P̂ = 0.50  ·  GT: strike occurred Day 31  ·  DATE-BLIND (Δ ≈ 44 days)',

      // ---- Limitations ---------------------------------------------------
      'lim.title': 'Limitations',
      'lim.item1.html': '<strong>Censored social-media signal.</strong> The Chinese social-media layer is censored and platform-curated; the opinion layer measures "opinion as visible on platform," not ground-truth population sentiment.',
      'lim.item2.html': '<strong>Forecasting-only scoring.</strong> The two scoring lines target forecasting; an LLM-as-judge quality axis (narrative coherence, justification rigor) is excluded for now.',
      'lim.item3.html': '<strong>Five events is a small sample.</strong> Per-event scores are released alongside the mean so a single long-horizon event cannot silently dominate cross-event conclusions; multi-event evaluation is strongly motivated.',

      // ---- Citation ------------------------------------------------------
      'cite.title': 'Citation',
      'cite.copy': '▸ COPY',

      // ====================================================================
      // ==  js.* — strings emitted dynamically by app.js                   ==
      // ====================================================================

      // BibTeX copy button feedback
      'js.bib.copied': '✓ COPIED',

      // Leaderboard table headers + cells
      'js.lb.header.system': 'System',
      'js.lb.header.type': 'Type',
      'js.lb.header.avg': 'Avg',
      'js.lb.cell.subhead': 'Cal | Time',
      'js.lb.cell.notreported.fmt': '— per-event not reported ({kind})',
      // Type-badge labels (also used as the text shown inside the "Type" column).
      // The CSS class is still derived from the English original, so styling is unaffected.
      'js.lb.type.llm': 'LLM',
      'js.lb.type.agent': 'AGENT',
      'js.lb.type.llm-proj': 'LLM · proj',
      'js.lb.type.agent-proj': 'AGENT · proj',
      'js.lb.type.human': 'HUMAN',
      'js.lb.type.baseline': 'BASELINE',

      // Leaderboard events tab — chips on each event card
      'js.lb.events.chip.pts.fmt': '{n} PTS',
      'js.lb.events.chip.cal.fmt': '{n} CAL',
      'js.lb.events.chip.time.fmt': '{n} TIME',

      // Bars view
      'js.bars.axis.cal': 'CAL',
      'js.bars.axis.time': 'TIME',
      'js.bars.overall.label': 'Overall (cross-event average)',
      'js.bars.baseline.cal': '50 = uniform 50% predictor · 100 = perfect',
      'js.bars.baseline.time': '50 = bucket-midpoint baseline · 100 = perfect timing',
      'js.bars.empty.fmt': '— no systems report {axis} for "{event}".',
      'js.bars.meta.fmt.html': '<b>{n}</b> systems shown · axis <span class="pill">{axis}</span> · event <span class="pill">{event}</span> · {note}',
      'js.bars.counter.cal': 'Cal',
      'js.bars.counter.time': 'Time',

      // Cached widget (interactive demo)
      'js.widget.ctx-meta.fmt': '{domain} · {cutoff}',
      'js.widget.cal-meta.fmt': 'WINDOW: {days} DAYS · GT BINARY',
      'js.widget.time-meta': 'GT: calendar day · scored by day-MAE',
      'js.widget.mout.proj': '  ·  PROJECTED',
      'js.widget.mout.best': '  ·  STRONGEST LLM',
      'js.widget.gt-hide': '✕ HIDE GT',
      'js.widget.gt-revealed': '✓ GT REVEALED',
      'js.widget.gt.yes': 'YES',
      'js.widget.gt.no': 'NO',
      'js.widget.gt.day.fmt': 'Day {d}',
      'js.widget.gt-note.fmt': '— {note}',

      // Model-button badges
      'js.widget.tag.best': 'BEST',
      'js.live.qchoice.more.fmt': 'Showing {shown} of this point\\u2019s {cal} calibration questions and {time} temporal events — use the box below for any other question.',
      'js.widget.gt-note.did': 'the event did occur inside the window',
      'js.widget.gt-note.didnot': 'the event did not occur inside the window',
      'try.view.time-q.text': 'On what date does this event happen?',
      'js.widget.cal.reason.plain': 'Answered {p}. Question weight {w}.',
      'js.widget.time.reason.plain': 'Predicted {pred}.',
      'js.widget.cal.reason.fmt': 'Answered {p}; ground truth {gt}. Absolute error {err}, question weight {w}.',
      'js.widget.time.reason.fmt': 'Predicted {pred}, actual {actual}, off by {days} days.',
      'js.widget.na.model': 'This model did not answer this question.',
      'js.widget.na.window': 'No model was asked this event — it falls outside the 90-day scoring window.',
      'js.widget.verdict.cal.fmt': 'Direction {dir}, absolute error {err}',
      'js.widget.verdict.time.fmt': 'date off by {days} days',
      'js.widget.qpick.unscored': 'not scored',
      'js.widget.qpick.count.fmt': '{n} questions',
      'js.widget.loading': 'loading…',
      'js.widget.verdict.fmt': 'Direction {dir}, absolute error {err}; date off by {days} days.',
      'js.widget.verdict.right': 'right',
      'js.widget.verdict.wrong': 'wrong',
      'js.widget.tag.proj': 'PROJ',
      'js.widget.tag.agent': 'AGENT',
      'js.widget.tag.llm': 'LLM',

      // Live mode
      'js.live.thinking': 'THINKING…',
      'js.live.thinking.note': 'calling /api/predict (5–30s)',
      'js.live.calling': 'calling real API…',
      'js.live.idle.tagline': 'Pick a question and 2 models, then hit RUN ▶ to call the live API',
      'js.live.idle.note': 'Each Run calls the model API in real time (~5–30s). Daily budget applies.',
      'js.live.awaiting': 'awaiting run',

      'js.live.banner.same-model': 'Pick two different models for the side-by-side comparison.',
      'js.live.banner.budget-exhausted': 'Live mode paused — daily budget exhausted, showing cached responses.',
      'js.live.banner.unavailable': 'Service unavailable (5xx) — try again later, or use cached mode.',
      'js.live.banner.no-backend': 'Backend not configured (/api/predict unreachable) — switching to cached mode.',

      'js.live.run.running': '▶ RUNNING…',
      'js.live.run.idle': '▶ RUN PREDICTION',
      'js.live.qchoice.cal-tag': 'CAL',
      'js.live.qchoice.time-tag': 'TIME',
      'js.live.qchoice.window.fmt': '{d}d window',
      'js.live.cq.hint.preset-cleared': 'Custom question active — preset selection cleared.',
      'js.live.cq.hint.default': 'Typing here clears the preset selection above.',

      // Verdicts (calibration)
      'js.live.verdict.uniform': 'uniform collapse — defaults to ~0.5',
      'js.live.verdict.calibrated': 'calibrated — commits in the correct direction',
      'js.live.verdict.low-conf': 'correct direction, low confidence',
      'js.live.verdict.wrong': 'wrong direction — overconfident on the opposite outcome',
      // Verdicts (temporal)
      'js.live.verdict.time.near.fmt': 'near-perfect timing (Δ ≈ {d}d)',
      'js.live.verdict.time.close.fmt': 'close timing (Δ ≈ {d}d)',
      'js.live.verdict.time.long.fmt': 'long-horizon collapse (Δ ≈ {d}d)',
      'js.live.verdict.time.over.fmt': 'over-extends a recent trend (Δ ≈ {d}d)',

      // Live GT bar
      'js.live.gt.headline': 'GROUND TRUTH',
      'js.live.gt.note-prefix': '— ',
      'js.live.gt.model-a': 'MODEL A',
      'js.live.gt.model-b': 'MODEL B',

      // Model select optgroups
      'js.model.group.llm': 'LLMs',
      'js.model.group.agent': 'Agents (projected)',
      'js.model.suffix.agent': '(agent)',

      // Suggest-topic form
      'js.suggest.hide': 'Hide form ↑',
      'js.suggest.required': 'PLEASE FILL THE REQUIRED FIELDS.',
      'js.suggest.submitting': '▸ SUBMITTING…',
      'js.suggest.unavailable': 'SERVICE UNAVAILABLE — TRY AGAIN LATER.',
      'js.suggest.submitted.html': '<div class="ok-msg">✓ SUBMITTED — WE\'LL BE IN TOUCH</div>',
      'js.suggest.submitted.text': 'SUBMITTED — WE\'LL BE IN TOUCH',

      // Drawer toggles
      'js.drawer.show': '[ SHOW SUBMISSION DETAILS ▾ ]',
      'js.drawer.hide': '[ HIDE SUBMISSION DETAILS ▴ ]',

      // Deep-dive — sub-block header
      'js.dd.subblock.fmt': 'SUB-BLOCK {num} / {title}',
      'js.dd.stress.subblock-label': 'STRESS CASES',
      // Stress card labels
      'js.dd.sc.stat.pts': 'PTS',
      'js.dd.sc.stat.days': 'DAYS',
      'js.dd.sc.stat.cal': 'CAL',
      'js.dd.sc.stat.time': 'TIME',
      'js.dd.sc.mean': 'Mean',
      'js.dd.sc.gemini': '★ Gemini',
      'js.dd.sc.qwen3': 'Qwen3',
      'js.dd.sc.gap.cal': 'Δ Cal',
      'js.dd.sc.gap.time': 'Δ Time',
      'js.dd.sc.pct-of-mean.fmt': '{pct}% of mean',
      // Deep-dive table column titles
      'js.dd.col.truth': 'Ground truth',
      'js.dd.col.tercile': 'Cutoff tercile',
      'js.dd.col.qb-comp': 'Question-bank composition',
      'js.dd.col.scoring-formula': 'Calibration scoring formula',
      'js.dd.col.reasoning-effort': 'Reasoning effort',
      'js.dd.col.anon-variant': 'Anonymization variant',
      'js.dd.col.cal': 'Cal',
      'js.dd.col.time': 'Time',
      'js.dd.col.doubao': 'Doubao',
      'js.dd.col.gemini': 'Gemini',
      'js.dd.col.gap': 'Gap',
      'js.dd.col.mean': 'Mean',
      'js.dd.col.pub': 'PUB',
      'js.dd.col.geo': 'GEO',
      'js.dd.col.tech': 'TECH',
      'js.dd.col.mkt': 'MKT',
      'js.dd.col.trade': 'TRADE',
      // Deep-dive leak marker
      'js.dd.leak.fmt': '+{leak} leak'
    },

    zh: {
      // Language toggle labels
      'lang.en': 'EN',
      'lang.zh': '中',
      'lang.toggle.title': '切换语言',

      // ---- Auth gate ------------------------------------------------------
      'auth.brand': 'SOCIETYBENCH',
      'auth.title': '私密预览',
      'auth.sub': '项目主页仍在开发中。请输入访问密码继续。',
      'auth.placeholder': '密码',
      'auth.btn': '▸ 解锁',
      'auth.err': '密码错误。',

      // ---- Sidebar --------------------------------------------------------
      'nav.brand': 'SOCIETYBENCH',
      'nav.ver': 'V0.1',
      'nav.group.start': '开始',
      'nav.overview': '总览',
      'nav.group.benchmark': '基准',
      'nav.method': '方法',
      'nav.try': '在线体验 ★',
      'nav.contribute': '参与贡献',
      'nav.group.results': '结果',
      'nav.leaderboard': '排行榜',
      'nav.deepdive': '深度分析',
      'nav.qualitative': '案例对比',
      'nav.group.about': '关于',
      'nav.limitations': '局限性',
      'nav.cite': '引用',
      'nav.external.paper': '论文 (PDF)',
      'nav.external.arxiv': 'arXiv',
      'nav.external.code': '代码',
      'nav.external.dataset': '数据集',
      'nav.external.video': '视频',
      'nav.footer.blind': '匿名版',
      'nav.footer.license': '数据: CC-BY-NC 4.0 · 代码: MIT',

      // ---- Mobile bar -----------------------------------------------------
      'mb.brand': 'SOCIETYBENCH',
      'mb.toggle': '▤ 菜单',

      // ---- Page header (breadcrumb + quick buttons) -----------------------
      'ph.crumb.root': 'SOCIETYBENCH',
      'ph.crumb.overview': '总览',
      'ph.crumb.method': '方法',
      'ph.crumb.try': '在线体验',
      'ph.crumb.contribute': '参与贡献',
      'ph.crumb.leaderboard': '排行榜',
      'ph.crumb.deepdive': '深度分析',
      'ph.crumb.qualitative': '案例对比',
      'ph.crumb.limitations': '局限性',
      'ph.crumb.cite': '引用',
      'ph.tag.version': 'V0.1',
      'ph.tag.blind': '匿名版',
      'ph.btn.paper': '▸ 论文',
      'ph.btn.arxiv': '▸ arXiv',
      'ph.btn.code': '▸ 代码',
      'ph.btn.bibtex': '▸ BibTeX',

      // ---- Hero -----------------------------------------------------------
      'hero.title': 'Society-Bench',
      'hero.title.main': 'SocietyBench',
      'hero.title.sub.lead': '预测',
      'hero.title.sub.accent': '反事实社会世界',
      'hero.title.sub.tail': '的演化',
      'hero.badge': '内部预览 · v0.1 · 匿名评审',
      'hero.pitch': '语言模型能否预测真实世界的社会事件？',
      'hero.pitch.long': '首个能评测大模型前瞻真实社会事件能力的 benchmark —— 真值数据来源于 Web 新闻与五个社媒平台,并经匿名化处理。',
      'hero.btn.paper': '论文',
      'hero.btn.leaderboard': '查看排行榜',
      'hero.btn.arxiv': 'arXiv',
      'hero.btn.code': '代码',
      'hero.btn.dataset': '数据集',
      'hero.btn.dataset.badge': '即将开放',
      'hero.btn.video': '视频',
      'hero.btn.bibtex': 'BibTeX',

      // ---- Abstract -------------------------------------------------------
      'about.title': '摘要',
      'about.p1': '我们提出首个能评测大模型前瞻真实社会事件能力的 benchmark——所用真值数据来自 Web 新闻与社媒,并已经过匿名化处理。',
      'about.p2.html': '我们并行从 Web 新闻与五个社媒平台采集帖子,通过一条六步 agent 链将每一源蒸馏为日期索引时间线,再合并为一份显式区分事实事件与公众舆论的统一年表。再经一道匿名化流程,把每段真实事件弧渲染为<strong>模拟社会世界</strong>——结构上与真实发生的完全一致,但剥去了模型能与预训练记忆比对的表面标签,使评测度量的是对社会世界演化的前向推理,而非记忆调取。在此之上,我们自动生成由 agent 审核的题库,支持两条正交的评测轴:概率校准与时间精度。',
      'about.p3': 'SocietyBench 把任意一行事件主题转化为匿名化的模拟社会世界,并以 agent 审核的题库从概率校准与时间精度两轴评测 LLM。',

      // ---- Key Contributions ---------------------------------------------
      'contrib.title': '关键贡献',
      'contrib.c01.num': '01',
      'contrib.c01.title': '模拟世界匿名化',
      'contrib.c01.body.html': '三阶段实体与日期匿名化(规则替换 → LLM 对抗审计循环,最多 5 轮,在 <strong>high = 0</strong> 与 <strong>mid = 0</strong> 处收敛 → 一致性校验)。把每段真实弧渲染为去标识化的模拟社会世界——结构上与真实发生的完全一致,但剥去了能与预训练记忆比对的表面标签。',
      'contrib.c02.num': '02',
      'contrib.c02.title': '双轴评测',
      'contrib.c02.body.html': '每个事件给出两个正交的 0–100 分:<strong>校准</strong>(用加权 MAE 对照二元真值打分;全答 50% 恰好得 50 分)与<strong>时间精度</strong>(以 30 天桶中点为 50 分基线,用按天 MAE 打分)。一个模型可能校准良好却对日期失灵,反之亦然;两者都需报告。',
      'contrib.c03.num': '03',
      'contrib.c03.title': '双源时间线',
      'contrib.c03.body.html': '对每个事件,流水线并行从 Web 新闻与五个社媒平台采集数据,合并为一份显式区分<strong>事实事件</strong>与<strong>公众舆论</strong>的统一年表——评测的是社会动态本身,而不仅是新闻事实。',

      // ---- Method --------------------------------------------------------
      'method.title': '方法',

      // Four-phase pipeline
      'method.4phase.title': '四阶段流水线',
      'method.4phase.intro': '本基准由四阶段流水线驱动:多源数据采集、时间线蒸馏、合并并匿名化为模拟社会世界,以及在概率校准与时间精度两个轴上评测模型。',
      'method.4phase.th1': '阶段',
      'method.4phase.th2': '工作内容',
      'method.4phase.p00.num': '00',
      'method.4phase.p00.name': '采集',
      'method.4phase.p00.desc': '跨五个平台采集网页新闻与社交媒体帖子',
      'method.4phase.p01.num': '01',
      'method.4phase.p01.name': '分源处理',
      'method.4phase.p01.desc': '将每条来源蒸馏为按日期编排的时间线',
      'method.4phase.p02.num': '02',
      'method.4phase.p02.name': '合并',
      'method.4phase.p02.desc': '将多源时间线合并为统一编年史,事实与舆论分开',
      'method.4phase.p03.num': '03',
      'method.4phase.p03.name': '评测',
      'method.4phase.p03.desc': '匿名化、出题,并按双轴评分',

      // Three-phase anonymization
      'method.3anon.title': '三阶段匿名化',
      'method.3anon.intro.html': '在任何候选模型看到内容之前,匿名化流水线先把每条合并后的时间线渲染为模拟社会世界。审计循环在 <strong>high = 0 与 mid = 0</strong> 处收敛,最多 5 轮。',
      'method.3anon.p01.num': '01',
      'method.3anon.p01.title': '基于规则的替换',
      'method.3anon.p01.body': '按表把实体换掉,再把所有日期平移同一个偏移量——间隔还在,日历没了。',
      'method.3anon.p02.num': '02',
      'method.3anon.p02.title': 'LLM 对抗审计循环',
      'method.3anon.p02.body.html': '审计 LLM 找还能被搜到的线索,找到什么就写成新规则,阶段 01 重跑。',
      'method.3anon.p03.num': '03',
      'method.3anon.p03.title': '一致性校验',
      'method.3anon.p03.body': '拿结果和原文比对,修好替换弄坏的地方。',

      // Dual-axis evaluation
      'method.dual.title': '双轴评测',
      'method.dual.intro': '在每个被纳入的预测点上,候选模型只看到截至某截止日期为止的上下文,并回答两类正交问题。',
      'method.dual.a1.tag': '轴 01 — 校准',
      'method.dual.a1.title': '概率校准。',
      'method.dual.a1.metric.html': '对在时窗 W 中的事件 E,模型输出 P(E 在 W 内发生) ∈ [0,1]。以二元真值为基准,采用<strong>加权 MAE</strong>评分。',
      'method.dual.a1.scale.0.html': '<b>50</b> 全答 50%',
      'method.dual.a1.scale.100.html': '<b>100</b> 完美预测器',
      'method.dual.a2.tag': '轴 02 — 时间',
      'method.dual.a2.title': '时间精度。',
      'method.dual.a2.metric.html': '对窗内每个事件,预测其日历日期。以 30 天桶中点为基线,采用<strong>按天 MAE</strong>评分。',
      'method.dual.a2.scale.50.html': '<b>50</b> 桶中点基线',
      'method.dual.a2.scale.100.html': '<b>100</b> 完美时间',

      // ---- Events covered ------------------------------------------------
      'events.title': '事件覆盖',
      'events.c01.num': '01',
      'events.c01.title': '公共论争',
      'events.c01.body': '某重点大学的网络争议事件。',
      'events.c01.pts': '[ 26 题 ]',
      'events.c02.num': '02',
      'events.c02.title': '贸易政策',
      'events.c02.body': '两大经济体之间的对等关税升级。',
      'events.c02.pts': '[ 25 题 ]',
      'events.c03.num': '03',
      'events.c03.title': '技术政策',
      'events.c03.body': '对某线上平台的国家剥离/禁令裁决。',
      'events.c03.pts': '[ 20 题 ]',
      'events.c04.num': '04',
      'events.c04.title': '地缘政治冲突',
      'events.c04.body': '两国之间的跨境军事对峙。',
      'events.c04.pts': '[ 30 题 ]',
      'events.c05.num': '05',
      'events.c05.title': '金融市场',
      'events.c05.body': '上市公司的退市危机。',
      'events.c05.pts': '[ 11 题 ]',

      // ---- Leaderboard ---------------------------------------------------
      'lb.title': '排行榜',
      'lb.stamp.refreshed': '数据更新',
      'lb.stamp.nextreview': '下次复核',
      'lb.stamp.schema': '字段版本',
      'lb.caption.html': '想把你的模型放上这张表? &nbsp;→&nbsp; 见下方 <a href="#expand">参与贡献</a>。',

      'lb.tab.models': '[ 模型 ]',
      'lb.tab.bars': '[ 条形图 ]',
      'lb.tab.events': '[ 事件 ]',
      'lb.tab.contributors.html': '[ 贡献者 ] <span style="font-size:9px;letter-spacing:0.18em;background:var(--ink);color:var(--orange);padding:2px 5px;margin-left:6px;">即将开放</span>',
      'lb.tab.contributors.title': '即将开放——随社区贡献而填充。',

      'lb.callout.html': '★ 六个前沿 LLM 中最强的总分也只有 <span class="big">75.0 / 100</span>,而平凡基准就是 50——大约只收回了一半空间。',
      'lb.loading': '加载中…',
      'lb.note.dagger.html': '<span class="sym">†</span> 智能体跑在 <em>Doubao-Seed-2.0-Pro</em> 基座上;该行真正衡量的是相对这个基座的增减。',
      'lb.note.star.html': '<span class="sym">★</span> 两个无模型基线不产出日期,时间轴按区间中点基准记为 50 分。',
      'lb.note.legend.html': '事件格子: <code>Cal | Time</code>。数值越高越好;100 = 完美,50 = 平凡基准(校准轴上全答 50%、时间轴上猜区间中点)。事件简称: PUB = 公共论争 · GEO = 地缘政治 · TECH = 技术政策 · MKT = 金融市场 · TRADE = 贸易政策。本表每个分数都是实测,本次发布不含任何推算值。',

      // Bars tab — toolbar controls
      'lb.bars.ctrl.event': '事件',
      'lb.bars.btn.overall': '总体',
      'lb.bars.btn.pub': 'PUB',
      'lb.bars.btn.geo': 'GEO',
      'lb.bars.btn.tech': 'TECH',
      'lb.bars.btn.mkt': 'MKT',
      'lb.bars.btn.trade': 'TRADE',
      'lb.bars.ctrl.axis': '轴',
      'lb.bars.btn.cal': '校准',
      'lb.bars.btn.time': '时间',
      'lb.bars.ctrl.sort': '排序',
      'lb.bars.btn.sort.score.html': '分数 <span class="arr">↓</span>',
      'lb.bars.btn.sort.name.html': '名称 <span class="arr">A→Z</span>',
      'lb.bars.ctrl.include': '包含',
      'lb.bars.btn.validated': '已验证',
      'lb.bars.btn.projected': '+ 预估',
      'lb.bars.btn.baselines': '+ 基线',

      // Bars tab — legend
      'lb.bars.legend.best': '当前选择最高',
      'lb.bars.legend.llm': '已验证 LLM',
      'lb.bars.legend.proj': '预估',
      'lb.bars.legend.ref': '基线',
      'lb.bars.legend.baseline-mark': '基线刻度',

      // Events tab inside leaderboard
      'lb.events.intro': '五条匿名化的事件弧。每张卡片显示弧情简述、预测点数量,以及该事件向题库贡献的题量。',
      'lb.events.footer.html': '▸ 更多事件将通过社区贡献加入——见 <a href="#expand" style="color: var(--orange-ink); border-bottom: 2px solid var(--orange); text-decoration: none; font-weight: 700;">参与贡献</a>。',

      // ---- Try the Benchmark ---------------------------------------------
      'try.title.html': '在线体验 <span style="color: var(--orange);">★</span>',
      'try.note.anon.label': '全部匿名化',
'try.subtitle': '选择一个匿名化事件与一个预测点。亲眼看看模型看到了什么、输出了什么,以及与真相相比偏差多大。',
      'try.tab.cached': '[ 缓存模式 ]',
      'try.tab.live': '[ 实时模式 ]',

      // Cached mode
      'try.cached.controls.label': '▸ 控制面板',
      'try.ctx.expand': '▾ 展开全文',
      'try.ctx.open': '▸ 查看完整上下文',
      'try.ctx.modal.title': '完整上下文 — 截止日期之前',
      'try.ctx.loading': '加载中…',
      'try.anon.note': '这里的内容是匿名化后的:实体被替换,所有日期整体平移同一个偏移量,所以这里的人名、机构名和日历日期都不对应真实世界。页面上的标准答案用的也是平移后的同一条时间线。',
      'try.ctx.collapse': '▴ 收起',
      'try.field.event': '事件',
      'try.field.point': '预测点',
      'try.field.model': '模型',
      'try.view.ctx.html': '上下文(截止日期之前) — <span class="meta" id="ctx-meta">—</span>',
      'try.view.cal-q': '校准题',
      'try.view.time-q': '时间题',
      'try.view.model-output.html': '模型输出 — <span class="meta" id="mout-name">—</span>',
      'try.view.phat-label': 'P̂  ·  校准',
      'try.view.dhat-label': 'D̂  ·  预测日',
      'try.view.gt': '真相 (Ground Truth)',
      'try.btn.reveal-gt.html': '<span class="glyph">▸</span> 显示真相',
      'try.gt-pending': '— 点击以对照模型输出与真实结果',
      'try.gv.cal.html': '校准真相 &nbsp;·&nbsp; <b id="gt-cal">—</b> <span style="color:var(--muted)" id="gt-cal-note"></span>',
      'try.gv.time.html': '时间真相 &nbsp;·&nbsp; <b id="gt-time">—</b>',
      'try.view.verdict': '评判结果',

      // Live mode
      'try.live.banner.html': '<span class="dot"></span>实时模式 — 通过 <code style="margin: 0 4px;">/api/predict</code> 调用真实模型 API。每日额度生效。',
      'try.live.controls.label': '▸ 控制面板 · 实时',
      'try.live.preview-gt-btn.html': '<span class="pv-glyph">▸</span> 预览此点真相',
      'try.live.pgt.cal': 'Cal 真相',
      'try.live.pgt.time': 'Time 真相',
      'try.live.pgt.hint': '▸ 小部件会先在模型卡里隐藏真相,直到你点击「显示真相」。此预览仅供操作者本人查看。',
      'try.live.q-field': '问题(从下方选一题,或自行撰写)',
      'try.live.custom-q.or.html': '<span class="cq-or">— 或自行撰写 —</span>',
      'try.live.custom-q.placeholder': '撰写一道校准题(在某时窗内是否发生 yes/no)或时间题(预测一个日历日)。后端 /api/predict 将收到 {question_id: \'custom\', question_text: \'…\'}。',
      'try.live.cq.cal': '校准',
      'try.live.cq.time': '时间',
      'try.live.cq.hint': '此处输入会清空上方的预设选项。',
      'try.live.models-field': '模型 — 并排对比',
      'try.live.model-a.label.html': '<span class="side-tag">A</span>模型 A',
      'try.live.model-b.label.html': '<span class="side-tag b">B</span>模型 B',
      'try.live.run-btn': '▶ 运行预测',
      'try.live.budget': '每日额度',
      'try.live.ctx.html': '上下文(截止日期之前) — <span class="meta" id="live-ctx-meta">—</span>',
      'try.live.result.label.html': '结果 — <span class="meta" id="live-result-meta">等待运行</span>',
      'try.live.result.awaiting': '等待运行',
      'try.live.lc.name.a': '模型 A',
      'try.live.lc.name.b': '模型 B',
      'try.live.lc.num-label.before-run': '先选一道题与两个模型,再点 RUN ▶ 调用实时 API',
      'try.live.lc.reason.before-run': '每次运行都会实时调用模型 API(约 5–30 秒)。每日额度生效。',
      'try.live.reveal-btn.html': '<span class="glyph">▸</span> 显示真相',

      // ---- Contribute (participate) section ------------------------------
      'cb.title': '参与贡献',
      'cb.subtitle': '你提交的一切都会经过审核,通过后即加入公开排行榜。',

      'cb.c1.num': '01',
      'cb.c1.title': '提交你的模型',
      'cb.c1.body': '在我们的 5 个事件上跑你的 LLM 或智能体,通过 PR 提交成绩卡。团队会用我们的评分代码重放你的原始答案——无需信誉,自动核算。',
      'cb.c1.action': '提交指南 →',
      'cb.c1.drawer-toggle': '[ 显示提交细节 ▾ ]',
      'cb.c1.drawer.html':
`提交什么  <span class="dim">(放到 submissions/&lt;你的名字&gt;/&lt;模型名&gt;/)</span>
  <span class="kw">▸</span> model_card.md         <span class="dim">— 名称、版本、参数量、训练截止</span>
  <span class="kw">▸</span> predictions.jsonl     <span class="dim">— 每行一题: {point_id, q_id, p_hat or d_hat}</span>
  <span class="kw">▸</span> run_metadata.json     <span class="dim">— 推理深度、解码参数、API 提供方、日期</span>
  <span class="kw">▸</span> scorecard.json        <span class="dim">— 由 /eval/predict_step4_scorecard.py 计算的分数</span>

流程
  <span class="kw">01</span>  克隆仓库,阅读 README 快速上手
  <span class="kw">02</span>  运行 \`python main.py --model &lt;你的模型&gt; --workspace ./run_&lt;你的模型&gt;\`
  <span class="kw">03</span>  验证你的 scorecard 与脚本计算结果一致
  <span class="kw">04</span>  提交一个包含上述四个文件的 PR

团队会用我们的官方评分代码重放你的原始答案。
匹配 → 上榜。绝无信誉系统漏洞。`,
      'cb.c1.drawer-cta': '[ 去 GitHub 提交 PR → ]',

      'cb.c2.num': '02',
      'cb.c2.title': '贡献新事件',
      'cb.c2.body': '使用我们公开的流水线(web-crawl → media-crawl → merge → anonymize → questionbank)构造一个匿名化新事件,通过 PR 提交;一经接纳,即加入官方 5+ 事件集。',
      'cb.c2.action': '流水线指南 →',
      'cb.c2.drawer-toggle': '[ 显示提交细节 ▾ ]',
      'cb.c2.drawer.html':
`提交什么  <span class="dim">(放到 submissions/&lt;你的名字&gt;/event-&lt;slug&gt;/)</span>
  <span class="kw">▸</span> event_meta.json       <span class="dim">— slug、领域、弧情起止日期、来源平台</span>
  <span class="kw">▸</span> timeline_anon.md      <span class="dim">— 最终匿名化时间线</span>
  <span class="kw">▸</span> replacements.json     <span class="dim">— 替换表(供审计)</span>
  <span class="kw">▸</span> questionbank/*.json   <span class="dim">— 每个预测点一份</span>
  <span class="kw">▸</span> gt/*.md               <span class="dim">— 每个预测点一份</span>
  <span class="kw">▸</span> audit_report.json     <span class="dim">— 阶段 2 必须达到 high=0 与 mid=0</span>

流程
  <span class="kw">01</span>  用 \`eval/total_pipeline.py\` 抓取 + 处理 + 匿名化你的事件
  <span class="kw">02</span>  验证匿名化审计已收敛(high=0,mid=0)
  <span class="kw">03</span>  提交一个包含该事件文件夹的 PR

被接纳的事件将加入官方事件目录,并随下一个基准版本一起发布。`,
      'cb.c2.drawer-cta': '[ 去 GitHub 提交 PR → ]',

      'cb.c3.num': '03',
      'cb.c3.title': '推荐选题',
      'cb.c3.body': '有事件想法但缺算力?把选题与大致时间区间发给我们。被采纳的建议会由我们运行流水线,并在贡献者名单中署上你的名字。',
      'cb.c3.action': '提交选题 →',

      // Suggest-topic form
      'cb.sf.name.label': '事件名称 / 一句话选题',
      'cb.sf.name.placeholder': '例: 跨境数据本地化政策的实施',
      'cb.sf.from.label': '大致起始',
      'cb.sf.from.placeholder': 'YYYY-MM',
      'cb.sf.to.label': '大致结束',
      'cb.sf.to.placeholder': 'YYYY-MM',
      'cb.sf.email.label': '你的邮箱',
      'cb.sf.email.placeholder': 'you@domain',
      'cb.sf.why.label': '为何选这个事件(2–3 行)',
      'cb.sf.why.placeholder': '这个事件值得加入的理由? 是否扩展了领域覆盖? 是否暴露了当前模型的失败模式?',
      'cb.sf.submit': '▸ 提交选题',

      // Bottom lines
      'cb.expand-note.html': '贡献者与事件成长统计将随基准发展而陆续呈现 · 当前: <strong>5 个事件</strong> · <strong>125 个预测点</strong> · 排行榜上 <strong>9 个系统</strong>',
      'cb.discussions.html': '对格式、方法或评分有疑问? &nbsp;→&nbsp; 在 <a href="#">GitHub Discussions ↗</a> 加入讨论',

      // ---- Deep dive (intro only; tables rendered by app.js) -------------
      'dd.title': '深度分析',
      'dd.validity.title': '匿名化真的有效吗?',
      'dd.validity.lede': '逐级关闭匿名化后的跨事件校准分。如果这个 benchmark 测的是记忆而不是预测,那么摘掉伪装模型就会显得更强 —— 事实正是如此。',
      'dd.validity.conclusion': '直接用未匿名的真实事件名,跨事件均分虚高 {gap} 分。这个差距来自记忆而非前瞻:有相当比例的题目变成了「认出真实事件」就能答对,而不需要向前推理。',
      'dd.validity.more': '逐事件明细与审核流程见论文 §4.2。',
      'dd.intro': '难度到底落在哪里。同一批作答换四种分法重看:按真值是真还是假、按截止点靠前还是靠后、按事件离截止点多远、按题目问的是什么。',

      // ---- Qualitative ---------------------------------------------------
      'qual.title': '案例对比',
      'qual.intro': '同一个匿名化的地缘政治预测点(截止第 22 日)。这同一个点被询问两次——一次问校准概率,一次问时间日期——分别交给四种候选: 最强 LLM、夹住主要失败模式(近期过度延伸、均匀塌陷)的两个 LLM、以及最强的预估智能体配置。',
      'qual.q1.label': '▸ 最强 LLM  ·  已校准',
      'qual.q1.text': '海军演习的部署叠加第 22–29 日逐步升级的言辞,表明已有意图;同时未见任何公开的降级通道,因此 14 日内出现武力反应的可能性较高。',
      'qual.q1.meta': 'P̂ = 0.78  ·  真相: 打击发生于第 31 日(在窗内)  ·  已校准',
      'qual.q2.label': '▸ 弱 LLM  ·  均匀塌陷',
      'qual.q2.text': '信号方向相反;依据不足,无法偏离先验。',
      'qual.q2.meta': 'P̂ = 0.50  ·  真相: 打击发生于第 31 日  ·  日期失灵 (Δ ≈ 44 日)',

      // ---- Limitations ---------------------------------------------------
      'lim.title': '局限性',
      'lim.item1.html': '<strong>社媒信号受审查。</strong> 中文社媒层经过审查与平台筛选;该层衡量的是"平台上可见的舆论",并非真实人群情绪。',
      'lim.item2.html': '<strong>仅评测预测能力。</strong> 两条评分线聚焦预测;以 LLM 为评审的质量轴(叙事连贯、论证严谨)暂未纳入。',
      'lim.item3.html': '<strong>5 个事件样本偏少。</strong> 我们与均值同时公布逐事件分数,以避免单一长周期事件悄然主导跨事件结论;扩大事件规模的评测被强烈鼓励。',

      // ---- Citation ------------------------------------------------------
      'cite.title': '引用',
      'cite.copy': '▸ 复制',

      // ====================================================================
      // ==  js.* — strings emitted dynamically by app.js                   ==
      // ====================================================================

      'js.bib.copied': '✓ 已复制',

      // Leaderboard table headers + cells
      'js.lb.header.system': '系统',
      'js.lb.header.type': '类型',
      'js.lb.header.avg': '均值',
      'js.lb.cell.subhead': 'Cal | Time',
      'js.lb.cell.notreported.fmt': '— 未报告逐事件分数 ({kind})',
      'js.lb.type.llm': 'LLM',
      'js.lb.type.agent': '智能体',
      'js.lb.type.llm-proj': 'LLM · 预估',
      'js.lb.type.agent-proj': '智能体 · 预估',
      'js.lb.type.human': '人类',
      'js.lb.type.baseline': '基线',

      // Leaderboard events tab — chips on each event card
      'js.lb.events.chip.pts.fmt': '{n} 预测点',
      'js.lb.events.chip.cal.fmt': '{n} Cal 题',
      'js.lb.events.chip.time.fmt': '{n} Time 题',

      // Bars view
      'js.bars.axis.cal': '校准',
      'js.bars.axis.time': '时间',
      'js.bars.overall.label': '总体(跨事件均值)',
      'js.bars.baseline.cal': '0 = 均匀 50% 预测器 · 100 = 完美',
      'js.bars.baseline.time': '50 = 时窗中点基线 · 100 = 完美时间',
      'js.bars.empty.fmt': '— "{event}" 上无系统报告 {axis} 分数。',
      'js.bars.meta.fmt.html': '已展示 <b>{n}</b> 个系统 · 轴 <span class="pill">{axis}</span> · 事件 <span class="pill">{event}</span> · {note}',
      'js.bars.counter.cal': 'Cal',
      'js.bars.counter.time': 'Time',

      // Cached widget (interactive demo)
      'js.widget.ctx-meta.fmt': '{domain} · {cutoff}',
      'js.widget.cal-meta.fmt': '时窗: {days} 日 · GT 二元',
      'js.widget.time-meta': 'GT: 日历日 · 按日 MAE 评分',
      'js.widget.mout.proj': '  ·  预估',
      'js.widget.mout.best': '  ·  最强 LLM',
      'js.widget.gt-hide': '✕ 收起真相',
      'js.widget.gt-revealed': '✓ 已显示真相',
      'js.widget.gt.yes': '是',
      'js.widget.gt.no': '否',
      'js.widget.gt.day.fmt': '第 {d} 日',
      'js.widget.gt-note.fmt': '— {note}',

      // Model-button badges
      'js.widget.tag.best': '最佳',
      'js.live.qchoice.more.fmt': '这个点共有 {cal} 道校准题、{time} 个时间题，这里列出前 {shown} 条；其余的用下面的输入框自己写。',
      'js.widget.gt-note.did': '该事件在窗口内确实发生',
      'js.widget.gt-note.didnot': '该事件在窗口内并未发生',
      'try.view.time-q.text': '这个事件会在哪一天发生？',
      'js.widget.cal.reason.plain': '答 {p}。该题权重 {w}。',
      'js.widget.time.reason.plain': '预测 {pred}。',
      'js.widget.cal.reason.fmt': '答 {p}；真值{gt}。绝对误差 {err}，该题权重 {w}。',
      'js.widget.time.reason.fmt': '预测 {pred}，实际 {actual}，相差 {days} 天。',
      'js.widget.na.model': '这个模型没有作答这道题。',
      'js.widget.na.window': '这个事件落在 90 天评分窗口外，没有向任何模型提问。',
      'js.widget.verdict.cal.fmt': '方向{dir}，绝对误差 {err}',
      'js.widget.verdict.time.fmt': '日期相差 {days} 天',
      'js.widget.qpick.unscored': '未评测',
      'js.widget.qpick.count.fmt': '共 {n} 题',
      'js.widget.loading': '加载中…',
      'js.widget.verdict.fmt': '方向{dir}，绝对误差 {err}；日期相差 {days} 天。',
      'js.widget.verdict.right': '正确',
      'js.widget.verdict.wrong': '错误',
      'js.widget.tag.proj': '预估',
      'js.widget.tag.agent': '智能体',
      'js.widget.tag.llm': 'LLM',

      // Live mode
      'js.live.thinking': '思考中…',
      'js.live.thinking.note': '正在调用 /api/predict (5–30 秒)',
      'js.live.calling': '正在调用真实 API…',
      'js.live.idle.tagline': '先选一道题与两个模型,再点 RUN ▶ 调用实时 API',
      'js.live.idle.note': '每次运行都会实时调用模型 API(约 5–30 秒)。每日额度生效。',
      'js.live.awaiting': '等待运行',

      'js.live.banner.same-model': '并排对比需要选两个不同的模型。',
      'js.live.banner.budget-exhausted': '实时模式已暂停 — 每日额度已用完,转为展示缓存回复。',
      'js.live.banner.unavailable': '服务不可用 (5xx) — 请稍后再试,或改用缓存模式。',
      'js.live.banner.no-backend': '后端未配置 (/api/predict 不可达) — 已自动切换到缓存模式。',

      'js.live.run.running': '▶ 运行中…',
      'js.live.run.idle': '▶ 运行预测',
      'js.live.qchoice.cal-tag': '校准',
      'js.live.qchoice.time-tag': '时间',
      'js.live.qchoice.window.fmt': '{d} 日窗口',
      'js.live.cq.hint.preset-cleared': '自定义题已激活 — 已清除上方预设选择。',
      'js.live.cq.hint.default': '此处输入会清空上方的预设选项。',

      // Verdicts (calibration)
      'js.live.verdict.uniform': '均匀塌陷 — 默认到 ~0.5',
      'js.live.verdict.calibrated': '已校准 — 朝正确方向有信心',
      'js.live.verdict.low-conf': '方向正确,但信心不足',
      'js.live.verdict.wrong': '方向错误 — 对相反结果过度自信',
      // Verdicts (temporal)
      'js.live.verdict.time.near.fmt': '时间近乎完美 (Δ ≈ {d} 日)',
      'js.live.verdict.time.close.fmt': '时间接近 (Δ ≈ {d} 日)',
      'js.live.verdict.time.long.fmt': '长周期塌陷 (Δ ≈ {d} 日)',
      'js.live.verdict.time.over.fmt': '过度延伸近期趋势 (Δ ≈ {d} 日)',

      // Live GT bar
      'js.live.gt.headline': '真相 (Ground Truth)',
      'js.live.gt.note-prefix': '— ',
      'js.live.gt.model-a': '模型 A',
      'js.live.gt.model-b': '模型 B',

      // Model select optgroups
      'js.model.group.llm': 'LLM 模型',
      'js.model.group.agent': '智能体(预估)',
      'js.model.suffix.agent': '(智能体)',

      // Suggest-topic form
      'js.suggest.hide': '收起表单 ↑',
      'js.suggest.required': '请填写必填项。',
      'js.suggest.submitting': '▸ 提交中…',
      'js.suggest.unavailable': '服务不可用 — 请稍后再试。',
      'js.suggest.submitted.html': '<div class="ok-msg">✓ 已提交 — 我们会与你联系</div>',
      'js.suggest.submitted.text': '已提交 — 我们会与你联系',

      // Drawer toggles
      'js.drawer.show': '[ 显示提交细节 ▾ ]',
      'js.drawer.hide': '[ 隐藏提交细节 ▴ ]',

      // Deep-dive — sub-block header
      'js.dd.subblock.fmt': '子块 {num} / {title}',
      'js.dd.stress.subblock-label': '极端用例',
      // Stress card labels
      'js.dd.sc.stat.pts': '预测点',
      'js.dd.sc.stat.days': '日',
      'js.dd.sc.stat.cal': 'Cal 题',
      'js.dd.sc.stat.time': 'Time 题',
      'js.dd.sc.mean': '均值',
      'js.dd.sc.gemini': '★ Gemini',
      'js.dd.sc.qwen3': 'Qwen3',
      'js.dd.sc.gap.cal': 'Δ Cal',
      'js.dd.sc.gap.time': 'Δ Time',
      'js.dd.sc.pct-of-mean.fmt': '占均值 {pct}%',
      // Deep-dive table column titles
      'js.dd.col.truth': '真值',
      'js.dd.col.tercile': '截止点档位',
      'js.dd.col.qb-comp': '题库构成',
      'js.dd.col.scoring-formula': '校准评分公式',
      'js.dd.col.reasoning-effort': '推理预算',
      'js.dd.col.anon-variant': '匿名化变体',
      'js.dd.col.cal': 'Cal',
      'js.dd.col.time': 'Time',
      'js.dd.col.doubao': 'Doubao',
      'js.dd.col.gemini': 'Gemini',
      'js.dd.col.gap': '差距',
      'js.dd.col.mean': '均值',
      'js.dd.col.pub': 'PUB',
      'js.dd.col.geo': 'GEO',
      'js.dd.col.tech': 'TECH',
      'js.dd.col.mkt': 'MKT',
      'js.dd.col.trade': 'TRADE',
      // Deep-dive leak marker
      'js.dd.leak.fmt': '+{leak} 泄露'
    }
  };

  // -------- Core API --------------------------------------------------------
  const STORAGE_KEY = 'sb_lang';
  const DEFAULT_LANG = 'en';
  const SUPPORTED = ['en', 'zh'];

  function getLang() {
    const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
    return SUPPORTED.includes(stored) ? stored : DEFAULT_LANG;
  }

  function t(key, lang) {
    const L = lang || getLang();
    const table = I18N[L] || I18N[DEFAULT_LANG];
    if (table && Object.prototype.hasOwnProperty.call(table, key)) return table[key];
    // Fallback chain: requested → default → key itself (loud failure aid)
    const fallback = I18N[DEFAULT_LANG];
    if (fallback && Object.prototype.hasOwnProperty.call(fallback, key)) return fallback[key];
    return key;
  }

  function applyLang(lang) {
    const L = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
    document.documentElement.lang = (L === 'zh') ? 'zh-Hans' : 'en';
    document.body.dataset.lang = L;

    // textContent
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      const val = t(key, L);
      if (val != null) el.textContent = val;
    });

    // innerHTML (use only for strings with inline markup)
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-html');
      const val = t(key, L);
      if (val != null) el.innerHTML = val;
    });

    // attributes: data-i18n-attr="placeholder:auth.placeholder,title:nav.foo"
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach(function (pair) {
        const parts = pair.split(':');
        if (parts.length !== 2) return;
        const attr = parts[0].trim();
        const key = parts[1].trim();
        const val = t(key, L);
        if (val != null) el.setAttribute(attr, val);
      });
    });

    // Toggle button active state
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === L);
      b.setAttribute('aria-pressed', String(b.dataset.lang === L));
    });
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    applyLang(lang);
    // Notify dynamic renderers (app.js etc.) — they re-render with the new lang
    window.dispatchEvent(new CustomEvent('sb:langchange', { detail: { lang: lang } }));
  }

  // -------- Public surface --------------------------------------------------
  window.SB_I18N = {
    t: t,
    getLang: getLang,
    setLang: setLang,
    applyLang: applyLang,
    SUPPORTED: SUPPORTED
  };

  // -------- Boot ------------------------------------------------------------
  function boot() {
    const lang = getLang();
    applyLang(lang);
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.dataset.lang); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
