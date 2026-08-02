/* SocietyBench — interactive demo page (Try it).
   Loaded after app.js, which provides t(), dataUrl(), tfmt() and currentLang(). */

// ============================ Interactive widget ==========================
const widgetState = {
  data: null,
  eventIdx: 0,
  pointIdx: 0,
  calIdx: 0,      // which of this point's calibration questions is shown
  timeIdx: 0,     // which of its temporal events is shown
  modelIdx: 0,
  revealed: false
};

function el(id) { return document.getElementById(id); }

function currentPoint() {
  const ev = widgetState.data.events[widgetState.eventIdx];
  const raw = ev.prediction_points[widgetState.pointIdx];
  return { event: ev, point: pointWithSelection(raw) };
}

// A prediction point carries several calibration questions and several temporal
// events, each with its own per-model answers. The widget shows one of each, so
// project the selection down to the shape the renderers already expect.
function pointWithSelection(raw) {
  const cals = raw.calibration_questions || [];
  const times = raw.temporal_events || [];
  if (!cals.length || !times.length) return raw;          // older data: use as-is
  const ci = Math.min(widgetState.calIdx, cals.length - 1);
  const ti = Math.min(widgetState.timeIdx, times.length - 1);
  const cq = cals[ci], tq = times[ti];
  const strip = (o, drop) => Object.fromEntries(Object.entries(o).filter(([k]) => !drop.includes(k)));
  const byModel = new Map(tq.responses.map(r => [r.model, r]));
  const responses = cq.responses.filter(c => byModel.has(c.model)).map(c => {
    const tr = byModel.get(c.model);
    return {
      model: c.model,
      is_best_overall: c.is_best_overall,
      calibration: strip(c, ["model", "is_best_overall"]),
      temporal: strip(tr, ["model", "is_best_overall"]),
      score_label: t("js.widget.verdict.fmt", "")
        ? tfmt(t("js.widget.verdict.fmt"), {
            dir: c.correct_side ? t("js.widget.verdict.right") : t("js.widget.verdict.wrong"),
            err: c.abs_error.toFixed(2), days: Math.round(tr.abs_error_days)
          })
        : `${c.correct_side ? "✓" : "✗"} ${c.abs_error.toFixed(2)} · ${Math.round(tr.abs_error_days)}d`
    };
  });
  if (widgetState.modelIdx >= responses.length) widgetState.modelIdx = 0;
  return Object.assign({}, raw, {
    calibration_question: strip(cq, ["responses"]),
    temporal_question: strip(tq, ["responses"]),
    model_responses: responses
  });
}

// Fill the two question pickers for the current point.
function renderQuestionPickers() {
  const raw = widgetState.data.events[widgetState.eventIdx].prediction_points[widgetState.pointIdx];
  const cals = raw.calibration_questions || [];
  const times = raw.temporal_events || [];
  const clip = (s, n) => (s || "").length > n ? (s || "").slice(0, n - 1) + "…" : (s || "");
  const zh = currentLang() === "zh";
  const DIFF = { hard: "难", medium: "中", easy: "易" };
  const diff = d => (zh ? (DIFF[d] || d || "") : (d || ""));
  const win = d => (zh ? `${d}天` : `${d}d`);
  const cs = el("cal-q-pick"), ts = el("time-q-pick");
  if (cs) {
    cs.innerHTML = cals.map((q, i) =>
      `<option value="${i}">${i + 1}/${cals.length} · ${win(q.window_days)} · ${diff(q.difficulty)} — ${clip(q.q, 52)}</option>`).join("");
    cs.value = String(Math.min(widgetState.calIdx, Math.max(cals.length - 1, 0)));
    cs.style.display = cals.length > 1 ? "" : "none";
  }
  if (ts) {
    ts.innerHTML = times.map((q, i) =>
      `<option value="${i}">${i + 1}/${times.length} · ${q.gt_date} — ${clip(q.event_desc, 52)}</option>`).join("");
    ts.value = String(Math.min(widgetState.timeIdx, Math.max(times.length - 1, 0)));
    ts.style.display = times.length > 1 ? "" : "none";
  }
}

function evalCalibration(p_hat, gt) {
  // direction-correct if (gt=1 and p_hat>=0.5) or (gt=0 and p_hat<0.5)
  if (gt === 1) return p_hat >= 0.5;
  return p_hat < 0.5;
}

function renderWidget() {
  const { event, point } = currentPoint();
  const model = point.model_responses[widgetState.modelIdx];

  el("ctx-meta").textContent = tfmt(t("js.widget.ctx-meta.fmt"), {
    domain: (event.domain_label || "").toLowerCase(),
    cutoff: (point.cutoff_label || "").toLowerCase()
  });
  el("ctx-text").textContent = point.context_excerpt;

  el("cal-q").textContent = point.calibration_question.q;
  el("cal-meta").textContent = tfmt(t("js.widget.cal-meta.fmt"), { days: point.calibration_question.window_days });

  const tdesc = point.temporal_question.event_desc;
  el("time-q").textContent = point.temporal_question.q + (tdesc ? " — " + tdesc : "");
  el("time-meta").textContent = t("js.widget.time-meta");

  // model output
  el("mout-name").textContent = model.model + (model.is_projected ? t("js.widget.mout.proj") : (model.is_best_overall ? t("js.widget.mout.best") : ""));

  // calibration p_hat — orange if correct direction, gray + strikethrough if not
  const calCorrect = evalCalibration(model.calibration.p_hat, point.calibration_question.gt);
  const phatEl = el("phat");
  phatEl.textContent = model.calibration.p_hat.toFixed(2);
  phatEl.classList.toggle("bad", !calCorrect);
  el("phat-reason").textContent = model.calibration.reasoning;

  // temporal d_hat — orange if abs_error<=7 days, otherwise gray + strikethrough
  const dhatEl = el("dhat");
  dhatEl.textContent = model.temporal.d_hat_label || tfmt(t("js.widget.gt.day.fmt"), { d: model.temporal.d_hat_day });
  const timeOk = (model.temporal.abs_error_days !== undefined) ? (model.temporal.abs_error_days <= 7) : true;
  dhatEl.classList.toggle("bad", !timeOk);
  el("dhat-reason").textContent = model.temporal.reasoning;

  // verdict
  el("verdict").textContent = model.score_label;

  // ground truth (apply current reveal state)
  applyRevealState();
}

function applyRevealState() {
  const { point } = currentPoint();
  const gtVals = el("gt-values");
  const gtPending = el("gt-pending");
  const btn = el("reveal-btn");
  if (widgetState.revealed) {
    gtVals.classList.remove("hidden");
    gtPending.style.display = "none";
    btn.disabled = true;
    btn.innerHTML = t("js.widget.gt-revealed");
    btn.style.opacity = 0.6;
    btn.style.cursor = "default";
    el("gt-cal").textContent = point.calibration_question.gt === 1 ? t("js.widget.gt.yes") : t("js.widget.gt.no");
    el("gt-cal-note").textContent = point.calibration_question.gt_note ? tfmt(t("js.widget.gt-note.fmt"), { note: point.calibration_question.gt_note }) : "";
    el("gt-time").textContent = point.temporal_question.gt_label || tfmt(t("js.widget.gt.day.fmt"), { d: point.temporal_question.gt_day });
  } else {
    gtVals.classList.add("hidden");
    gtPending.style.display = "";
    btn.disabled = false;
    btn.innerHTML = t("try.btn.reveal-gt.html");
    btn.style.opacity = "";
    btn.style.cursor = "";
  }
}

function buildSelectors() {
  const evSel = el("evt-select");
  evSel.innerHTML = widgetState.data.events.map((e, i) =>
    `<option value="${i}">${e.domain_label} — ${e.anonymized_arc}</option>`
  ).join("");
  evSel.value = widgetState.eventIdx;
  evSel.addEventListener("change", () => {
    widgetState.eventIdx = parseInt(evSel.value, 10);
    widgetState.pointIdx = 0;
    widgetState.calIdx = 0;
    widgetState.timeIdx = 0;
    widgetState.modelIdx = 0;
    widgetState.revealed = false;
    buildPointSelector();
    renderQuestionPickers();
    buildModelButtons();
    renderWidget();
  });
  buildPointSelector();
  buildQuestionPickers();
  buildModelButtons();
}

// Wire the two question pickers once; they are refilled on every point change.
function buildQuestionPickers() {
  renderQuestionPickers();
  const cs = el("cal-q-pick"), ts = el("time-q-pick");
  if (cs) cs.onchange = () => {
    widgetState.calIdx = parseInt(cs.value, 10);
    widgetState.revealed = false;
    buildModelButtons();
    renderWidget();
  };
  if (ts) ts.onchange = () => {
    widgetState.timeIdx = parseInt(ts.value, 10);
    widgetState.revealed = false;
    buildModelButtons();
    renderWidget();
  };
}

function buildPointSelector() {
  const ptSel = el("pt-select");
  const ev = widgetState.data.events[widgetState.eventIdx];
  ptSel.innerHTML = ev.prediction_points.map((p, i) =>
    `<option value="${i}">${p.cutoff_label}</option>`
  ).join("");
  ptSel.value = widgetState.pointIdx;
  ptSel.onchange = () => {
    widgetState.pointIdx = parseInt(ptSel.value, 10);
    widgetState.calIdx = 0;
    widgetState.timeIdx = 0;
    widgetState.revealed = false;
    renderQuestionPickers();
    buildModelButtons();
    renderWidget();
  };
}

function buildModelButtons() {
  const host = el("model-btns");
  const { point } = currentPoint();
  host.innerHTML = point.model_responses.map((m, i) => {
    const tag = m.is_best_overall ? t("js.widget.tag.best") : (m.is_projected ? t("js.widget.tag.proj") : t("js.widget.tag.llm"));
    const cls = i === widgetState.modelIdx ? "model-btn active" : "model-btn";
    return `<button type="button" class="${cls}" data-i="${i}">${m.model}<span class="mtag">${tag}</span></button>`;
  }).join("");
  host.querySelectorAll(".model-btn").forEach(b => {
    b.addEventListener("click", () => {
      widgetState.modelIdx = parseInt(b.dataset.i, 10);
      host.querySelectorAll(".model-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      renderWidget();
    });
  });
}

el("reveal-btn") && el("reveal-btn").addEventListener("click", () => {
  if (widgetState.revealed) return;
  widgetState.revealed = true;
  applyRevealState();
});

async function loadWidget() {
  try {
    const res = await fetch(dataUrl("interactive_demo"));
    widgetState.data = await res.json();
  } catch (err) {
    console.error("Failed to load interactive demo:", err);
    return;
  }
  buildSelectors();
  renderWidget();
}


// ============================ Mode tabs (cached / live) ==================
const MODEL_OPTIONS = [
  // --- the six frontier LLMs evaluated in the paper ---
  { id: "gpt-5.5",             label: "GPT-5.5",             group: "LLM" },
  { id: "gemini-3.5-flash",    label: "Gemini-3.5-Flash",    group: "LLM" },
  { id: "claude-opus-4.8",     label: "Claude-Opus-4.8",     group: "LLM" },
  { id: "deepseek-v4-pro",     label: "DeepSeek-V4-Pro",     group: "LLM" },
  { id: "kimi-k2.5",           label: "Kimi-K2.5",           group: "LLM" },
  { id: "doubao-seed-2.0-pro", label: "Doubao-Seed-2.0-Pro", group: "LLM" },
  // --- the three agent frameworks, all on the Doubao base model ---
  { id: "langgraph-doubao",    label: "LangGraph + Doubao",  group: "AGENT" },
  { id: "autogen-doubao",      label: "AutoGen + Doubao",    group: "AGENT" },
  { id: "mirofish-doubao",     label: "MiroFish + Doubao",   group: "AGENT" }
];

// Live-mode preset questions are sourced per-event from interactive_demo.json
// (events[i].live_questions). This helper returns the current event's questions,
// with a graceful fallback to a top-level `live_questions` array (v0.1 schema).
function currentLiveQuestions() {
  if (!widgetState.data) return [];
  const ev = widgetState.data.events?.[liveState.eventIdx];
  // Presets follow the selected prediction point: the same real questions the
  // cached mode replays, so a live run is asked exactly what we asked.
  const pt = ev?.prediction_points?.[liveState.pointIdx];
  const cals = pt?.calibration_questions || [];
  const times = pt?.temporal_events || [];
  if (cals.length || times.length) {
    return cals.map((q, i) => ({
      id: `${pt.point_id}·C${i + 1}`, type: "calibration",
      window: q.window_days, text: q.q
    })).concat(times.map((e, i) => ({
      id: `${pt.point_id}·T${i + 1}`, type: "temporal",
      window: null, text: e.event_desc ? `${e.q} — ${e.event_desc}` : e.q
    })));
  }
  if (ev && Array.isArray(ev.live_questions)) return ev.live_questions;
  return Array.isArray(widgetState.data.live_questions) ? widgetState.data.live_questions : [];
}

const liveState = {
  eventIdx: 0,
  pointIdx: 0,
  questionIdx: 0,
  customQ: "",                // free-form question text (overrides preset when non-empty)
  customType: "calibration",  // "calibration" | "temporal"
  modelA: "gemini-3.1-pro",
  modelB: "doubao-seed-2.0-lite",
  lastResult: null,
  revealed: false,
  busy: false
};

function setBanner(html, kind="info") {
  const host = el("try-banner-host");
  if (!html) { host.innerHTML = ""; return; }
  host.innerHTML = `<div class="mode-banner ${kind}"><span class="dot"></span>${html}</div>`;
}

function switchTab(name) {
  document.querySelectorAll(".tab[data-tab]").forEach(t => {
    const active = t.dataset.tab === name;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.dataset.pane === name);
  });
}

document.querySelectorAll(".tab[data-tab]").forEach(t => {
  t.addEventListener("click", () => {
    const name = t.dataset.tab;
    switchTab(name);
    if (name === "cached") setBanner("");
  });
});

// ----- Live mode wiring -----
function fillModelOptions(selectEl, defaultVal) {
  // Group into LLM and AGENT optgroups for clearer choice.
  const llms = MODEL_OPTIONS.filter(m => m.group === "LLM");
  const agents = MODEL_OPTIONS.filter(m => m.group === "AGENT");
  const agentSuffix = t("js.model.suffix.agent");
  selectEl.innerHTML = `
    <optgroup label="${t("js.model.group.llm")}">
      ${llms.map(m => `<option value="${m.id}">${m.label}</option>`).join("")}
    </optgroup>
    <optgroup label="${t("js.model.group.agent")}">
      ${agents.map(m => `<option value="${m.id}">${m.label} ${agentSuffix}</option>`).join("")}
    </optgroup>`;
  selectEl.value = defaultVal;
}

function renderLiveQuestions() {
  const host = el("qchoice-list");
  const Qs = currentLiveQuestions();
  // clamp index when switching events
  if (liveState.questionIdx >= Qs.length) liveState.questionIdx = 0;
  host.innerHTML = Qs.map((q, i) => {
    const typeTag = q.type === "calibration" ? t("js.live.qchoice.cal-tag") : t("js.live.qchoice.time-tag");
    const winTag = q.window ? `<span class="qtag win">${tfmt(t("js.live.qchoice.window.fmt"), { d: q.window })}</span>` : "";
    return `
      <label class="qchoice ${i === liveState.questionIdx ? "selected" : ""}" data-i="${i}">
        <input type="radio" name="lq" ${i === liveState.questionIdx ? "checked" : ""} />
        <div class="qrow-top">
          <span class="qmark" aria-hidden="true"></span>
          <span class="qtag">${q.id} · ${typeTag}</span>
          ${winTag}
        </div>
        <div class="qtxt">${q.text}</div>
      </label>`;
  }).join("");
  host.querySelectorAll(".qchoice").forEach(c => {
    c.addEventListener("click", (e) => {
      e.preventDefault();
      liveState.questionIdx = parseInt(c.dataset.i, 10);
      host.querySelectorAll(".qchoice").forEach(x => x.classList.remove("selected"));
      c.classList.add("selected");
      c.querySelector("input").checked = true;
      // selecting a preset clears the custom question
      const ci = el("custom-q-input");
      if (ci && ci.value) {
        ci.value = "";
        liveState.customQ = "";
        const cqHint = el("cq-hint");
        if (cqHint) {
          cqHint.textContent = t("js.live.cq.hint.default");
          cqHint.classList.remove("active");
        }
      }
    });
  });
}

function initLiveSelectors() {
  // We share the cached widget's data for event + prediction-point dropdowns,
  // and read LIVE_QUESTIONS from the same JSON file. Both load asynchronously,
  // so we poll until widgetState.data exists.
  function tryInit() {
    if (!widgetState.data) { setTimeout(tryInit, 100); return; }
    const evSel = el("live-evt-select");
    evSel.innerHTML = widgetState.data.events.map((e, i) =>
      `<option value="${i}">${e.domain_label} — ${e.anonymized_arc}</option>`
    ).join("");
    evSel.value = liveState.eventIdx;
    evSel.addEventListener("change", () => {
      liveState.eventIdx = parseInt(evSel.value, 10);
      liveState.pointIdx = 0;
      liveState.questionIdx = 0;
      liveState.customQ = "";
      const ci = el("custom-q-input");
      if (ci) ci.value = "";
      const cqHint = el("cq-hint");
      if (cqHint) { cqHint.textContent = t("js.live.cq.hint.default"); cqHint.classList.remove("active"); }
      refreshLivePtSelector();
      refreshLiveContext();
      renderLiveQuestions();
      closePreviewGT();
    });
    refreshLivePtSelector();
    refreshLiveContext();
    renderLiveQuestions();
  }
  tryInit();

  fillModelOptions(el("live-model-a"), liveState.modelA);
  fillModelOptions(el("live-model-b"), liveState.modelB);
  el("live-model-a").addEventListener("change", e => { liveState.modelA = e.target.value; });
  el("live-model-b").addEventListener("change", e => { liveState.modelB = e.target.value; });

  el("run-btn").addEventListener("click", runLivePrediction);
  el("live-reveal-btn").addEventListener("click", () => {
    liveState.revealed = true;
    renderLiveGT();
  });

  // Preview-GT button (operator-only peek at the answer)
  el("preview-gt-btn")?.addEventListener("click", togglePreviewGT);

  // Custom question textarea
  const customInput = el("custom-q-input");
  const cqHint = el("cq-hint");
  customInput?.addEventListener("input", () => {
    liveState.customQ = customInput.value.trim();
    if (liveState.customQ) {
      // de-select all preset radios
      document.querySelectorAll("#qchoice-list .qchoice").forEach(c => c.classList.remove("selected"));
      document.querySelectorAll("#qchoice-list .qchoice input").forEach(i => { i.checked = false; });
      cqHint.textContent = t("js.live.cq.hint.preset-cleared");
      cqHint.classList.add("active");
    } else {
      cqHint.textContent = t("js.live.cq.hint.default");
      cqHint.classList.remove("active");
      // restore selection on the current preset
      const sel = document.querySelector(`#qchoice-list .qchoice[data-i="${liveState.questionIdx}"]`);
      sel?.classList.add("selected");
      const inp = sel?.querySelector("input");
      if (inp) inp.checked = true;
    }
  });
  document.querySelectorAll('input[name="cq-type"]').forEach(r => {
    r.addEventListener("change", e => { liveState.customType = e.target.value; });
  });
}

function refreshLivePtSelector() {
  const ev = widgetState.data.events[liveState.eventIdx];
  const ptSel = el("live-pt-select");
  ptSel.innerHTML = ev.prediction_points.map((p, i) =>
    `<option value="${i}">${p.cutoff_label}</option>`
  ).join("");
  ptSel.value = liveState.pointIdx;
  ptSel.onchange = () => {
    liveState.pointIdx = parseInt(ptSel.value, 10);
    liveState.questionIdx = 0;
    renderLiveQuestions();
    refreshLiveContext();
    refreshPreviewGT();
    closePreviewGT();
  };
  refreshPreviewGT();
}

function refreshPreviewGT() {
  if (!widgetState.data) return;
  const ev = widgetState.data.events[liveState.eventIdx];
  const pt = ev?.prediction_points?.[liveState.pointIdx];
  if (!pt) return;
  const calGt = pt.calibration_question?.gt === 1 ? t("js.widget.gt.yes")
              : (pt.calibration_question?.gt === 0 ? t("js.widget.gt.no") : "—");
  const timeGt = pt.temporal_question?.gt_label
              || (pt.temporal_question?.gt_day ? tfmt(t("js.widget.gt.day.fmt"), { d: pt.temporal_question.gt_day }) : "—");
  const note = pt.calibration_question?.gt_note ? tfmt(t("js.widget.gt-note.fmt"), { note: pt.calibration_question.gt_note }) : "";
  const setT = (id, v) => { const e = el(id); if (e) e.textContent = v; };
  setT("pgt-cal", calGt);
  setT("pgt-cal-note", note);
  setT("pgt-time", timeGt);
}

function closePreviewGT() {
  const btn = el("preview-gt-btn");
  const card = el("preview-gt-card");
  if (!btn || !card) return;
  btn.setAttribute("aria-expanded", "false");
  card.hidden = true;
  btn.querySelector(".pv-glyph").textContent = "▸";
}

function togglePreviewGT() {
  const btn = el("preview-gt-btn");
  const card = el("preview-gt-card");
  if (!btn || !card) return;
  const open = btn.getAttribute("aria-expanded") === "true";
  if (open) {
    closePreviewGT();
  } else {
    refreshPreviewGT();
    btn.setAttribute("aria-expanded", "true");
    card.hidden = false;
    btn.querySelector(".pv-glyph").textContent = "▾";
  }
}

function refreshLiveContext() {
  const ev = widgetState.data.events[liveState.eventIdx];
  const pt = ev.prediction_points[liveState.pointIdx];
  el("live-ctx-meta").textContent = tfmt(t("js.widget.ctx-meta.fmt"), {
    domain: (ev.domain_label || "").toLowerCase(),
    cutoff: (pt.cutoff_label || "").toLowerCase()
  });
  el("live-ctx-text").textContent = pt.context_excerpt;
}

function modelLabel(id) {
  const m = MODEL_OPTIONS.find(x => x.id === id);
  return m ? m.label : id;
}

function renderThinking() {
  const a = el("live-card-a"), b = el("live-card-b");
  for (const [card, side, modelId] of [[a, "A", liveState.modelA], [b, "B", liveState.modelB]]) {
    card.classList.add("thinking");
    card.innerHTML = `
      <div class="lc-header">
        <span class="lc-name">${modelLabel(modelId)}</span>
        <span class="lc-side ${side === "B" ? "b" : ""}">${side}</span>
      </div>
      <span class="lc-num-label">${t("js.live.thinking")}</span>
      <div class="lc-num">—</div>
      <div class="lc-reason">${t("js.live.thinking.note")}</div>`;
  }
  el("live-result-meta").textContent = t("js.live.calling");
}

function renderLiveResults(result) {
  const cards = [
    { el: el("live-card-a"), side: "A", modelId: liveState.modelA },
    { el: el("live-card-b"), side: "B", modelId: liveState.modelB }
  ];
  cards.forEach((c, idx) => {
    const r = result.results[idx];
    c.el.classList.remove("thinking");
    const isCal = r.type === "calibration";
    const big = isCal ? Number(r.p_hat).toFixed(2) : (r.d_hat_label || tfmt(t("js.widget.gt.day.fmt"), { d: r.d_hat_day }));
    const lab = isCal ? t("try.view.phat-label") : t("try.view.dhat-label");
    c.el.innerHTML = `
      <div class="lc-header">
        <span class="lc-name">${r.model || modelLabel(c.modelId)}</span>
        <span class="lc-side ${c.side === "B" ? "b" : ""}">${c.side}</span>
      </div>
      <span class="lc-num-label">${lab}</span>
      <div class="lc-num">${big}</div>
      <div class="lc-reason">${r.reasoning}</div>`;
  });
  const qId = (liveState.customQ && liveState.customQ.length > 0)
    ? "custom"
    : currentLiveQuestions()[liveState.questionIdx]?.id || "—";
  el("live-result-meta").textContent = `${qId} · ${result.results[0].type}`;

  // budget bar
  if (typeof result.remaining_budget_pct === "number") {
    const pct = Math.max(0, Math.min(100, result.remaining_budget_pct));
    const bar = el("budget-bar");
    bar.style.display = "flex";
    el("budget-fill").style.transform = `scaleX(${pct/100})`;
    el("budget-pct").textContent = pct + "%";
    bar.classList.toggle("low", pct < 20);
  }

  // show reveal-GT button
  liveState.revealed = false;
  el("live-reveal-row").style.display = "";
  el("live-gt-host").style.display = "none";
  el("live-gt-host").innerHTML = "";
}

function verdictFor(r, gt) {
  if (!gt) return "—";
  if (gt.type === "calibration") {
    const yes = gt.y === 1;
    const p = r.p_hat;
    if (Math.abs(p - 0.5) < 0.06) return t("js.live.verdict.uniform");
    if ((yes && p >= 0.7) || (!yes && p <= 0.3)) return t("js.live.verdict.calibrated");
    if ((yes && p >= 0.5) || (!yes && p < 0.5)) return t("js.live.verdict.low-conf");
    return t("js.live.verdict.wrong");
  }
  // temporal
  const dhat = r.d_hat_day;
  if (dhat === undefined || dhat === null) return "—";
  const diff = Math.abs(dhat - gt.y);
  if (diff <= 3)  return tfmt(t("js.live.verdict.time.near.fmt"),  { d: diff });
  if (diff <= 14) return tfmt(t("js.live.verdict.time.close.fmt"), { d: diff });
  if (diff > 30)  return tfmt(t("js.live.verdict.time.long.fmt"),  { d: diff });
  return tfmt(t("js.live.verdict.time.over.fmt"), { d: diff });
}

function renderLiveGT() {
  const r = liveState.lastResult;
  if (!r || !r.ground_truth) return;
  const gt = r.ground_truth;
  const gtVal = (gt.type === "calibration")
    ? (gt.y === 1 ? t("js.widget.gt.yes") : t("js.widget.gt.no"))
    : (gt.y_label || tfmt(t("js.widget.gt.day.fmt"), { d: gt.y }));
  const vA = verdictFor(r.results[0], gt);
  const vB = verdictFor(r.results[1], gt);
  const host = el("live-gt-host");
  host.style.display = "";
  host.innerHTML = `
    <div class="live-gt-bar">
      <div class="gt-headline">${t("js.live.gt.headline")} &nbsp;·&nbsp; <b>${gtVal}</b>${gt.note ? ` &nbsp;<span style="color:var(--muted); font-weight:500;">${t("js.live.gt.note-prefix")}${gt.note}</span>` : ""}</div>
      <div class="gt-verdicts">
        <div class="gt-verdict"><b>${t("js.live.gt.model-a")} · ${modelLabel(liveState.modelA)}</b>${vA}</div>
        <div class="gt-verdict"><b>${t("js.live.gt.model-b")} · ${modelLabel(liveState.modelB)}</b>${vB}</div>
      </div>
    </div>`;
  el("live-reveal-row").style.display = "none";
}

async function runLivePrediction() {
  if (liveState.busy) return;
  if (liveState.modelA === liveState.modelB) {
    setBanner(t("js.live.banner.same-model"), "warn");
    return;
  }
  setBanner("");
  liveState.busy = true;
  const runBtn = el("run-btn");
  runBtn.disabled = true;
  runBtn.textContent = t("js.live.run.running");

  renderThinking();

  const ev = widgetState.data.events[liveState.eventIdx];
  const pt = ev.prediction_points[liveState.pointIdx];
  const Qs = currentLiveQuestions();
  const usingCustom = liveState.customQ && liveState.customQ.length > 0;
  const q = usingCustom
    ? { id: "custom", type: liveState.customType, text: liveState.customQ }
    : Qs[liveState.questionIdx];
  const body = {
    event_id: ev.id,
    point_id: pt.point_id,
    question_id: q.id,
    question_text: q.text,
    question_type: q.type,
    models: [liveState.modelA, liveState.modelB]
  };

  let result = null;
  try {
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (res.status === 429) {
      const payload = await safeJson(res);
      setBanner(t("js.live.banner.budget-exhausted"), "warn");
      switchTab("cached");
      restoreIdleLiveCards();
      return;
    }
    if (res.status >= 500) {
      setBanner(t("js.live.banner.unavailable"), "error");
      restoreIdleLiveCards();
      return;
    }
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    result = await res.json();
  } catch (err) {
    // Network failure / no backend / CORS — treat as "backend not configured"
    setBanner(t("js.live.banner.no-backend"), "error");
    switchTab("cached");
    restoreIdleLiveCards();
    return;
  } finally {
    liveState.busy = false;
    runBtn.disabled = false;
    runBtn.textContent = t("js.live.run.idle");
  }

  // attach type info if backend omitted it (defensive)
  result.results.forEach(r => { if (!r.type) r.type = q.type; });
  if (result.ground_truth && !result.ground_truth.type) result.ground_truth.type = q.type;

  liveState.lastResult = result;
  renderLiveResults(result);
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

function restoreIdleLiveCards() {
  const idleTagline = t("js.live.idle.tagline");
  const idleNote    = t("js.live.idle.note");
  const a = el("live-card-a"), b = el("live-card-b");
  for (const [card, side] of [[a, ""], [b, "b"]]) {
    card.classList.remove("thinking");
    const nameLabel = side === "b" ? t("try.live.lc.name.b") : t("try.live.lc.name.a");
    const sideLabel = side === "b" ? "B" : "A";
    card.innerHTML = `
      <div class="lc-header">
        <span class="lc-name">${nameLabel}</span>
        <span class="lc-side ${side}">${sideLabel}</span>
      </div>
      <span class="lc-num-label">${idleTagline}</span>
      <div class="lc-num" style="color: var(--muted); font-size: 32px;">—</div>
      <div class="lc-reason" style="color: var(--muted);">${idleNote}</div>`;
  }
  el("live-result-meta").textContent = t("js.live.awaiting");
  el("live-reveal-row").style.display = "none";
  el("live-gt-host").style.display = "none";
  el("live-gt-host").innerHTML = "";
}

// kick off live-mode init (waits for cached data to be available)
initLiveSelectors();


// ============================ Boot =======================================
loadWidget();

// ---- Language flip: rebuild the widget and live panes, preserving state ----
window.SB_DEMO = {
  async onLangChange() {
    const saved = { e: widgetState.eventIdx, p: widgetState.pointIdx, m: widgetState.modelIdx, r: widgetState.revealed };
    await loadWidget();
    widgetState.eventIdx = Math.min(saved.e, (widgetState.data?.events?.length || 1) - 1);
    widgetState.pointIdx = Math.min(saved.p, (widgetState.data?.events?.[widgetState.eventIdx]?.prediction_points?.length || 1) - 1);
    widgetState.modelIdx = Math.min(saved.m, (widgetState.data?.events?.[widgetState.eventIdx]?.prediction_points?.[widgetState.pointIdx]?.model_responses?.length || 1) - 1);
    widgetState.revealed = saved.r;
    buildSelectors();
    if (widgetState.data) {
      const liveEvSel = el("live-evt-select");
      if (liveEvSel) {
        liveEvSel.innerHTML = widgetState.data.events.map((e, i) =>
          `<option value="${i}">${e.domain_label} — ${e.anonymized_arc}</option>`).join("");
        liveEvSel.value = liveState.eventIdx;
      }
      refreshLivePtSelector();
      refreshLiveContext();
      renderLiveQuestions();
      refreshPreviewGT();
    }
    renderWidget();
    if (el("live-model-a")) fillModelOptions(el("live-model-a"), liveState.modelA);
    if (el("live-model-b")) fillModelOptions(el("live-model-b"), liveState.modelB);
    if (!liveState.lastResult) restoreIdleLiveCards();
  }
};
