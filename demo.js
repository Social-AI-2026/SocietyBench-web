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

// The index lists every prediction point; a point's questions live in their own
// file (demo/<lang>/<event>/<PID>.json) and are fetched the first time the point
// is picked. 25k calibration questions cannot travel in one payload.
const pointCache = new Map();

function currentEvent() { return widgetState.data.events[widgetState.eventIdx]; }
function currentEntry() { return currentEvent().prediction_points[widgetState.pointIdx]; }

async function ensurePoint(entry) {
  const key = entry.file;
  if (pointCache.has(key)) return pointCache.get(key);
  const res = await fetch(`./${entry.file}`);
  const data = await res.json();
  pointCache.set(key, data);
  return data;
}

// The point currently loaded, or null while a fetch is in flight.
function loadedPoint() {
  const e = currentEntry();
  return e ? (pointCache.get(e.file) || null) : null;
}

function currentCal() {
  const p = loadedPoint();
  if (!p || !p.cal.length) return null;
  return p.cal[Math.min(widgetState.calIdx, p.cal.length - 1)];
}
function currentTime() {
  const p = loadedPoint();
  if (!p || !p.time.length) return null;
  return p.time[Math.min(widgetState.timeIdx, p.time.length - 1)];
}

// A model's own answer to the selected question, or null if it never answered.
function answerOf(rec, modelIdx) {
  if (!rec) return null;
  return (rec.r || []).find(x => x[0] === modelIdx) || null;
}

// Fill the two question pickers for the current point. Every question of both
// exams is listed -- a point can carry several hundred calibration questions.
function renderQuestionPickers() {
  const point = loadedPoint();
  const cals = point ? point.cal : [];
  const times = point ? point.time : [];
  const clip = (s, n) => (s || "").length > n ? (s || "").slice(0, n - 1) + "…" : (s || "");
  const zh = currentLang() === "zh";
  const DIFF = { hard: "难", medium: "中", easy: "易" };
  const diff = d => (zh ? (DIFF[d] || d || "") : (d || ""));
  const win = d => (zh ? `${d}天` : `${d}d`);
  const cs = el("cal-q-pick"), ts = el("time-q-pick");
  if (cs) {
    cs.innerHTML = cals.map((q, i) =>
      `<option value="${i}">${i + 1}/${cals.length} · ${win(q.wd)} · ${diff(q.diff)} — ${clip(q.q, 52)}</option>`).join("");
    cs.value = String(Math.min(widgetState.calIdx, Math.max(cals.length - 1, 0)));
    cs.style.display = cals.length > 1 ? "" : "none";
  }
  if (ts) {
    ts.innerHTML = times.map((q, i) => {
      const tag = (q.r && q.r.length) ? "" : ` · ${t("js.widget.qpick.unscored")}`;
      return `<option value="${i}">${i + 1}/${times.length} · ${q.gt}${tag} — ${clip(q.desc, 46)}</option>`;
    }).join("");
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
  const event = currentEvent();
  const entry = currentEntry();
  const point = loadedPoint();
  if (!point) return;                       // still fetching; called again on arrival
  const models = point.models;
  if (widgetState.modelIdx >= models.length) widgetState.modelIdx = 0;
  const mi = widgetState.modelIdx;
  const cq = currentCal(), tq = currentTime();
  const ca = answerOf(cq, mi), ta = answerOf(tq, mi);

  el("ctx-meta").textContent = tfmt(t("js.widget.ctx-meta.fmt"), {
    domain: (event.domain_label || "").toLowerCase(),
    cutoff: (entry.label || "").toLowerCase()
  });
  el("ctx-text").textContent = point.context_excerpt;

  el("cal-q").textContent = cq ? cq.q : "—";
  el("cal-meta").textContent = cq ? tfmt(t("js.widget.cal-meta.fmt"), { days: cq.wd }) : "—";

  const timeQ = t("try.view.time-q.text", currentLang() === "zh" ? "这个事件会在哪一天发生？" : "On what date does this event happen?");
  el("time-q").textContent = tq ? (tq.desc ? `${timeQ} — ${tq.desc}` : timeQ) : "—";
  el("time-meta").textContent = t("js.widget.time-meta");

  el("mout-name").textContent = models[mi] + (models[mi] === (widgetState.data.best || "") ? t("js.widget.mout.best") : "");

  // calibration — orange when the direction is right, gray + struck through when not
  const phatEl = el("phat");
  if (ca) {
    const p_hat = ca[1];
    const err = Math.abs(p_hat - cq.gt);
    phatEl.textContent = p_hat.toFixed(2);
    phatEl.classList.toggle("bad", !evalCalibration(p_hat, cq.gt));
    el("phat-reason").textContent = tfmt(t("js.widget.cal.reason.fmt"), {
      p: `${Math.round(p_hat * 100)}%`,
      gt: cq.gt === 1 ? t("js.widget.gt.yes") : t("js.widget.gt.no"),
      err: err.toFixed(2), w: (cq.wt || 0).toFixed(2)
    });
  } else {
    phatEl.textContent = "—";
    phatEl.classList.remove("bad");
    el("phat-reason").textContent = t("js.widget.na.model");
  }

  // temporal — orange when within a week, gray + struck through beyond it
  const dhatEl = el("dhat");
  if (ta) {
    dhatEl.textContent = ta[1];
    dhatEl.classList.toggle("bad", !(ta[2] <= 7));
    el("dhat-reason").textContent = tfmt(t("js.widget.time.reason.fmt"), {
      pred: ta[1], actual: tq.gt, days: Math.round(ta[2])
    });
  } else {
    dhatEl.textContent = "—";
    dhatEl.classList.remove("bad");
    el("dhat-reason").textContent = (tq && !(tq.r || []).length)
      ? t("js.widget.na.window") : t("js.widget.na.model");
  }

  // verdict — whichever halves this model actually answered
  const parts = [];
  if (ca) parts.push(tfmt(t("js.widget.verdict.cal.fmt"), {
    dir: evalCalibration(ca[1], cq.gt) ? t("js.widget.verdict.right") : t("js.widget.verdict.wrong"),
    err: Math.abs(ca[1] - cq.gt).toFixed(2)
  }));
  if (ta) parts.push(tfmt(t("js.widget.verdict.time.fmt"), { days: Math.round(ta[2]) }));
  el("verdict").textContent = parts.length
    ? parts.join(currentLang() === "zh" ? "；" : "; ") + (currentLang() === "zh" ? "。" : ".")
    : t("js.widget.na.model");

  applyRevealState();
}

function applyRevealState() {
  const cq = currentCal(), tq = currentTime();
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
    el("gt-cal").textContent = cq ? (cq.gt === 1 ? t("js.widget.gt.yes") : t("js.widget.gt.no")) : "—";
    el("gt-cal-note").textContent = cq ? tfmt(t("js.widget.gt-note.fmt"), {
      note: cq.gt === 1 ? t("js.widget.gt-note.did") : t("js.widget.gt-note.didnot")
    }) : "";
    el("gt-time").textContent = tq ? tq.gt : "—";
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
  evSel.addEventListener("change", async () => {
    widgetState.eventIdx = parseInt(evSel.value, 10);
    widgetState.modelIdx = 0;
    widgetState.pointIdx = 0;
    buildPointSelector();
    await selectPoint(0);
  });
  buildPointSelector();
  wireQuestionPickers();
}

// Load the picked point, then refill everything that depends on it.
async function selectPoint(idx) {
  widgetState.pointIdx = idx;
  widgetState.calIdx = 0;
  widgetState.timeIdx = 0;
  widgetState.revealed = false;
  const entry = currentEntry();
  el("cal-q").textContent = t("js.widget.loading");
  el("time-q").textContent = t("js.widget.loading");
  try {
    await ensurePoint(entry);
  } catch (err) {
    console.error("Failed to load prediction point:", entry && entry.file, err);
    return;
  }
  if (currentEntry() !== entry) return;      // the user moved on while we fetched
  renderQuestionPickers();
  buildModelButtons();
  renderWidget();
}

// The two question pickers are wired once and refilled on every point change.
function wireQuestionPickers() {
  const cs = el("cal-q-pick"), ts = el("time-q-pick");
  if (cs) cs.onchange = () => {
    widgetState.calIdx = parseInt(cs.value, 10);
    widgetState.revealed = false;
    renderWidget();
  };
  if (ts) ts.onchange = () => {
    widgetState.timeIdx = parseInt(ts.value, 10);
    widgetState.revealed = false;
    renderWidget();
  };
}

function buildPointSelector() {
  const ptSel = el("pt-select");
  const ev = widgetState.data.events[widgetState.eventIdx];
  ptSel.innerHTML = ev.prediction_points.map((p, i) =>
    `<option value="${i}">${p.label}</option>`
  ).join("");
  ptSel.value = widgetState.pointIdx;
  ptSel.onchange = () => selectPoint(parseInt(ptSel.value, 10));
}

function buildModelButtons() {
  const host = el("model-btns");
  const point = loadedPoint();
  if (!point) { host.innerHTML = ""; return; }
  const best = widgetState.data.best || "";
  host.innerHTML = point.models.map((m, i) => {
    const tag = m === best ? t("js.widget.tag.best") : t("js.widget.tag.llm");
    const cls = i === widgetState.modelIdx ? "model-btn active" : "model-btn";
    return `<button type="button" class="${cls}" data-i="${i}">${m}<span class="mtag">${tag}</span></button>`;
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
    const res = await fetch(dataUrl("demo_index"));
    widgetState.data = await res.json();
  } catch (err) {
    console.error("Failed to load the demo index:", err);
    return;
  }
  buildSelectors();
  await selectPoint(widgetState.pointIdx);
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

// Live-mode presets follow the selected event AND prediction point: the same
// real questions cached mode replays. A point can hold hundreds of them, so the
// list shows the first LIVE_PRESET_MAX and says how many there are in total; the
// free-text box takes anything else.
const LIVE_PRESET_MAX = 12;

function liveEntry() {
  const ev = widgetState.data?.events?.[liveState.eventIdx];
  return ev?.prediction_points?.[liveState.pointIdx] || null;
}
function livePoint() {
  const en = liveEntry();
  return en ? (pointCache.get(en.file) || null) : null;
}
async function ensureLivePoint() {
  const en = liveEntry();
  if (!en) return null;
  try { return await ensurePoint(en); }
  catch (err) { console.error("Failed to load prediction point:", en.file, err); return null; }
}

function currentLiveQuestions() {
  const pt = livePoint();
  if (!pt) return [];
  const timeQ = t("try.view.time-q.text");
  const cals = pt.cal.slice(0, LIVE_PRESET_MAX).map((q, i) => ({
    id: `${pt.point_id}·C${i + 1}`, type: "calibration", window: q.wd, text: q.q
  }));
  const times = pt.time.slice(0, LIVE_PRESET_MAX).map((e, i) => ({
    id: `${pt.point_id}·T${i + 1}`, type: "temporal", window: null,
    text: e.desc ? `${timeQ} — ${e.desc}` : timeQ
  }));
  return cals.concat(times);
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
  // Say what the list leaves out — a point can hold hundreds of questions.
  const pt = livePoint();
  if (pt && (pt.cal.length > LIVE_PRESET_MAX || pt.time.length > LIVE_PRESET_MAX)) {
    host.insertAdjacentHTML("beforeend",
      `<p class="qchoice-note">${tfmt(t("js.live.qchoice.more.fmt"), {
        shown: Qs.length, cal: pt.cal.length, time: pt.time.length })}</p>`);
  }
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
    `<option value="${i}">${p.label}</option>`
  ).join("");
  ptSel.value = liveState.pointIdx;
  ptSel.onchange = async () => {
    liveState.pointIdx = parseInt(ptSel.value, 10);
    liveState.questionIdx = 0;
    await ensureLivePoint();
    renderLiveQuestions();
    refreshLiveContext();
    refreshPreviewGT();
    closePreviewGT();
  };
  ensureLivePoint().then(() => { renderLiveQuestions(); refreshLiveContext(); refreshPreviewGT(); });
}

function refreshPreviewGT() {
  if (!widgetState.data) return;
  const pt = livePoint();
  if (!pt) return;
  const q = pt.cal[0], e0 = pt.time[0];
  const calGt = q ? (q.gt === 1 ? t("js.widget.gt.yes") : t("js.widget.gt.no")) : "—";
  const timeGt = e0 ? e0.gt : "—";
  const note = q ? tfmt(t("js.widget.gt-note.fmt"), {
    note: q.gt === 1 ? t("js.widget.gt-note.did") : t("js.widget.gt-note.didnot")
  }) : "";
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
  const en = liveEntry(), pt = livePoint();
  el("live-ctx-meta").textContent = tfmt(t("js.widget.ctx-meta.fmt"), {
    domain: (ev.domain_label || "").toLowerCase(),
    cutoff: (en?.label || "").toLowerCase()
  });
  el("live-ctx-text").textContent = pt ? pt.context_excerpt : t("js.widget.loading");
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
    const saved = { e: widgetState.eventIdx, p: widgetState.pointIdx, m: widgetState.modelIdx,
                    c: widgetState.calIdx, tt: widgetState.timeIdx, r: widgetState.revealed };
    pointCache.clear();                       // point files are per-language
    await loadWidget();
    widgetState.eventIdx = Math.min(saved.e, (widgetState.data?.events?.length || 1) - 1);
    widgetState.pointIdx = Math.min(saved.p, (widgetState.data?.events?.[widgetState.eventIdx]?.prediction_points?.length || 1) - 1);
    buildSelectors();
    await selectPoint(widgetState.pointIdx);
    const pt = loadedPoint();
    widgetState.modelIdx = Math.min(saved.m, (pt?.models?.length || 1) - 1);
    widgetState.calIdx = Math.min(saved.c, (pt?.cal?.length || 1) - 1);
    widgetState.timeIdx = Math.min(saved.tt, (pt?.time?.length || 1) - 1);
    widgetState.revealed = saved.r;
    renderQuestionPickers();
    buildModelButtons();
    if (widgetState.data) {
      const liveEvSel = el("live-evt-select");
      if (liveEvSel) {
        liveEvSel.innerHTML = widgetState.data.events.map((e, i) =>
          `<option value="${i}">${e.domain_label} — ${e.anonymized_arc}</option>`).join("");
        liveEvSel.value = liveState.eventIdx;
      }
      refreshLivePtSelector();
      await ensureLivePoint();
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
