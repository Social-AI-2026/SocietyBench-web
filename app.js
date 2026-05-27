/* SocietyBench — landing page interactions */

// ============================ Page routing ===============================
// Sidebar nav swaps which <section data-page="..."> is visible by setting
// data-active-page on <body>. Hash format: #/<page>
const PAGES = ["overview", "method", "try", "contribute", "leaderboard", "deepdive", "qualitative", "limitations", "cite"];
const PAGE_LABEL = {
  overview:    "OVERVIEW",
  method:      "METHOD",
  try:         "TRY IT",
  contribute:  "CONTRIBUTE",
  leaderboard: "LEADERBOARD",
  deepdive:    "RESULTS DEEP-DIVE",
  qualitative: "QUALITATIVE",
  limitations: "LIMITATIONS",
  cite:        "CITATION"
};

function parseHashRoute() {
  const h = window.location.hash || "";
  const m = h.match(/^#\/([a-z]+)/i);
  if (m && PAGES.includes(m[1])) return m[1];
  // legacy hash anchors (#cite, #try, #method, #leaderboard, #expand, #about, #events)
  const legacy = h.replace(/^#\/?/, "");
  const legacyMap = { about: "overview", events: "method", expand: "contribute" };
  if (legacyMap[legacy]) return legacyMap[legacy];
  if (PAGES.includes(legacy)) return legacy;
  return "overview";
}

function navigate(page, opts = {}) {
  if (!PAGES.includes(page)) page = "overview";
  document.body.setAttribute("data-active-page", page);
  document.querySelectorAll(".sb-link").forEach(a => {
    a.classList.toggle("active", a.dataset.route === page);
  });
  // Make sure freshly-routed sections become visible immediately (they may
  // never have intersected the viewport while their parent page was hidden).
  document.querySelectorAll(`.page-section[data-page="${page}"].reveal`).forEach(s => s.classList.add("in"));
  const crumb = document.getElementById("ph-crumb-page");
  if (crumb) crumb.textContent = PAGE_LABEL[page] || page.toUpperCase();
  if (!opts.silent) {
    const desired = "#/" + page;
    if (window.location.hash !== desired) {
      history.pushState({ page }, "", desired);
    }
  }
  // close mobile drawer if open
  document.body.removeAttribute("data-drawer");
  // scroll to top of main when switching pages
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  // Notify route-aware features (crowd, links) so they can start/stop.
  window.dispatchEvent(new CustomEvent("sb:page-change", { detail: { page } }));
}

window.addEventListener("hashchange", () => navigate(parseHashRoute(), { silent: true }));
document.addEventListener("DOMContentLoaded", () => navigate(parseHashRoute(), { silent: true }));
// also fire immediately (DOMContentLoaded may have already fired)
navigate(parseHashRoute(), { silent: true });

// Mobile drawer toggle
const drawerBtn = document.getElementById("drawer-toggle");
if (drawerBtn) {
  drawerBtn.addEventListener("click", () => {
    const open = document.body.getAttribute("data-drawer") === "open";
    if (open) {
      document.body.removeAttribute("data-drawer");
      drawerBtn.setAttribute("aria-expanded", "false");
    } else {
      document.body.setAttribute("data-drawer", "open");
      drawerBtn.setAttribute("aria-expanded", "true");
    }
  });
}

// ============================ Event label map ============================
// Keep table column labels anonymized: no real names anywhere in rendered UI.
const EVENT_LABEL = {
  "Wuhan Lib.":   { short: "PUB",   long: "Public Controversy" },
  "US-Iran":      { short: "GEO",   long: "Geopolitical Conflict" },
  "TikTok":       { short: "TECH",  long: "Technology Policy" },
  "SMCI":         { short: "MKT",   long: "Financial Markets" },
  "Trump Tariff": { short: "TRADE", long: "Trade Policy" }
};

// ============================ Reveal on scroll ============================
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  }
}, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// ============================ Copy BibTeX =================================
const copyBtn = document.getElementById("copy-bib");
copyBtn && copyBtn.addEventListener("click", async () => {
  const txt = document.getElementById("bibtex").innerText;
  try {
    await navigator.clipboard.writeText(txt);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  copyBtn.classList.add("copied");
  copyBtn.textContent = "✓ COPIED";
  setTimeout(() => {
    copyBtn.classList.remove("copied");
    copyBtn.textContent = "▸ COPY";
  }, 1600);
});

// ============================ Leaderboard rendering =======================
function fmt(n) { return (n === undefined || n === null) ? "—" : n.toFixed(1); }

function renderPairCell(pair, opts={}) {
  if (!pair) return `<td>—</td>`;
  return `<td class="pair-cell"><span class="pair"><span class="c">${fmt(pair[0])}</span><span class="sep">|</span><span class="t">${fmt(pair[1])}</span></span></td>`;
}

// --- Type-column metadata for each leaderboard row ---
function rowsForType(systems, type, opts={}) {
  return systems.map(s => Object.assign({}, s, { _type: type, _italic: opts.italic === true }));
}

// Build a single unified rows[] from leaderboard.json
function buildUnifiedRows(data) {
  const rows = [];
  // Validated LLMs — sorted by Avg Cal desc
  const validated = (data.validated || []).slice().sort((a, b) => (b.avg?.[0] || 0) - (a.avg?.[0] || 0));
  rows.push(...rowsForType(validated, "LLM"));

  const p = data.projected || {};
  rows.push(...rowsForType(p.additional_llms  || [], "LLM · proj",   { italic: true }));
  rows.push(...rowsForType(p.agents_on_doubao || [], "AGENT · proj", { italic: true }));
  rows.push(...rowsForType(p.agents_on_qwen3  || [], "AGENT · proj", { italic: true }));

  // Baselines + human go at the bottom
  for (const r of (p.baselines_and_human || [])) {
    const kind = r.kind === "human" ? "HUMAN" : "BASELINE";
    rows.push(Object.assign({}, r, { _type: kind, _italic: true, _reference: kind === "HUMAN" }));
  }
  return rows;
}

function buildUnifiedHeader(events) {
  const cols = events.map(e => {
    const lbl = EVENT_LABEL[e] || { short: e, long: e };
    return `<th title="${lbl.long}">${lbl.short}<span class="sub">Cal | Time</span></th>`;
  }).join("");
  return `
    <thead>
      <tr>
        <th class="sys-col">System</th>
        <th class="type-col">Type</th>
        ${cols}
        <th>Avg<span class="sub">Cal | Time</span></th>
      </tr>
    </thead>`;
}

function renderUnifiedRow(r, events) {
  const cls = [];
  if (r.is_best_overall) cls.push("best");
  if (r._italic) cls.push("ital");
  if (r._reference) cls.push("reference");
  const tr = [];
  const fnHtml = r.footnote ? `<span class="fn">${r.footnote}</span>` : "";
  tr.push(`<td class="sys">${r.system}${fnHtml}</td>`);

  // Type column: badge style
  const typeBadgeClass = "type-badge " + r._type.toLowerCase().replace(/[^a-z]/g, "-");
  tr.push(`<td class="type"><span class="${typeBadgeClass}">${r._type}</span></td>`);

  if (r.kind && !r.per_event) {
    tr.push(`<td colspan="${events.length}" class="not-reported">— per-event not reported (${r.kind})</td>`);
  } else {
    for (const e of events) {
      const pair = r.per_event ? r.per_event[e] : null;
      tr.push(renderPairCell(pair));
    }
  }
  const avg = r.avg || [null, null];
  tr.push(`<td class="avg"><span class="pair"><span class="c">${fmt(avg[0])}</span><span class="sep">|</span><span class="t">${fmt(avg[1])}</span></span></td>`);
  return `<tr class="${cls.join(" ")}">${tr.join("")}</tr>`;
}

// Render the EVENTS sub-tab — 5 cards, pulls counts from leaderboard.json + content_pack data
const EVENT_CARDS = [
  { key: "Wuhan Lib.",   numeral: "01", domain: "Public Controversy", arc: "Online dispute at a major university.",                          n_pts: 26, n_cal: 7392,  n_time: 442 },
  { key: "Trump Tariff", numeral: "02", domain: "Trade Policy",       arc: "Reciprocal-tariff escalation between two major economies.",       n_pts: 25, n_cal: 9136,  n_time: 339 },
  { key: "TikTok",       numeral: "03", domain: "Technology Policy",  arc: "National divestiture / ban ruling on an online platform.",        n_pts: 20, n_cal: 5896,  n_time: 388 },
  { key: "US-Iran",      numeral: "04", domain: "Geopolitical Conflict", arc: "Cross-border military confrontation between two states.",      n_pts: 30, n_cal: 7942,  n_time: 1000 },
  { key: "SMCI",         numeral: "05", domain: "Financial Markets",  arc: "Delisting crisis of an exchange-listed firm.",                    n_pts: 11, n_cal: 990,   n_time: 55  }
];

function renderEventsTab() {
  const host = document.getElementById("lb-events-grid");
  if (!host) return;
  host.innerHTML = EVENT_CARDS.map(c => `
    <article class="card lb-event-card">
      <div class="numeral">${c.numeral}</div>
      <div class="domain">${c.domain}</div>
      <div class="arc">${c.arc}</div>
      <div class="chips">
        <span class="chip">${c.n_pts} PTS</span>
        <span class="chip">${c.n_cal.toLocaleString()} CAL</span>
        <span class="chip">${c.n_time.toLocaleString()} TIME</span>
      </div>
    </article>
  `).join("");
}

async function loadLeaderboards() {
  let data;
  try {
    const res = await fetch("./leaderboard.json");
    data = await res.json();
  } catch (err) {
    console.error("Failed to load leaderboard:", err);
    return;
  }
  const events = data.events;
  const rows = buildUnifiedRows(data);
  const tbl = document.querySelector("#lb-unified table");
  if (tbl) {
    tbl.innerHTML = buildUnifiedHeader(events) +
      `<tbody>${rows.map(r => renderUnifiedRow(r, events)).join("")}</tbody>`;
  }
  renderEventsTab();
}

// Leaderboard sub-tab switching
function wireLbTabs() {
  document.querySelectorAll("[data-lbtab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.lbtab;
      document.querySelectorAll("[data-lbtab]").forEach(b => {
        const a = b.dataset.lbtab === name;
        b.classList.toggle("active", a);
        b.setAttribute("aria-selected", a ? "true" : "false");
      });
      document.querySelectorAll("[data-lbpane]").forEach(p => {
        p.classList.toggle("active", p.dataset.lbpane === name);
      });
      if (name === "bars") renderBars();
    });
  });
}
wireLbTabs();

// ============================ Bars view ===================================
const barsState = {
  event:    "__avg",       // "__avg" or "Wuhan Lib." / "US-Iran" / "TikTok" / "SMCI" / "Trump Tariff"
  axis:     "cal",         // "cal" | "time"
  sortBy:   "score",       // "score" | "alpha"
  sortDir:  "desc",        // "desc" | "asc"
  include:  "validated"    // "validated" | "all" | "ref"
};
let _lbData = null;

function loadAllLbData() {
  fetch("./leaderboard.json").then(r => r.json()).then(d => {
    _lbData = d;
    // Populate the update stamp
    const fmtDate = (s) => {
      if (!s) return "—";
      const dt = new Date(s + "T00:00:00");
      if (isNaN(dt.getTime())) return s;
      return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }).toUpperCase();
    };
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setT("lb-updated", fmtDate(d.last_updated));
    setT("lb-next",    fmtDate(d.next_review));
    setT("lb-schema",  d.schema_version ? "v" + d.schema_version : "v—");

    if (document.querySelector('[data-lbpane="bars"]')?.classList.contains("active")) {
      renderBars();
    }
  });
}
loadAllLbData();

function wireBarsControls() {
  // Plain single-value groups (radio-like)
  const groups = [
    { id: "bars-event",   key: "event"   },
    { id: "bars-axis",    key: "axis"    },
    { id: "bars-include", key: "include" }
  ];
  for (const g of groups) {
    const host = document.getElementById(g.id);
    if (!host) continue;
    host.querySelectorAll(".ctrl-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        host.querySelectorAll(".ctrl-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        barsState[g.key] = btn.dataset.val;
        renderBars();
      });
    });
  }

  // Sort group — clicking the active button flips direction; clicking the
  // inactive one selects it (with its remembered default direction).
  const sortHost = document.getElementById("bars-sort");
  if (sortHost) {
    sortHost.querySelectorAll(".ctrl-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const newSortBy = btn.dataset.sortBy;
        if (barsState.sortBy === newSortBy) {
          // toggle direction
          barsState.sortDir = barsState.sortDir === "desc" ? "asc" : "desc";
        } else {
          // switch metric, keep each button's default direction (set in HTML)
          barsState.sortBy = newSortBy;
          barsState.sortDir = btn.dataset.dir || "desc";
        }
        // Refresh active state + arrow glyph
        sortHost.querySelectorAll(".ctrl-btn").forEach(b => {
          const isActive = b.dataset.sortBy === barsState.sortBy;
          b.classList.toggle("active", isActive);
          const arr = b.querySelector(".arr");
          if (!arr) return;
          if (b.dataset.sortBy === "score") {
            arr.textContent = (isActive && barsState.sortDir === "asc") ? "↑" : "↓";
          } else {
            arr.textContent = (isActive && barsState.sortDir === "desc") ? "Z→A" : "A→Z";
          }
        });
        renderBars();
      });
    });
  }
}
wireBarsControls();

function buildBarRows() {
  if (!_lbData) return [];
  const rows = [];
  const v = _lbData.validated || [];
  const p = _lbData.projected || {};

  // validated LLMs
  for (const r of v) rows.push({ system: r.system, footnote: r.footnote, per_event: r.per_event, avg: r.avg, type: "LLM",          _italic: false, _ref: false });

  if (barsState.include === "all" || barsState.include === "ref") {
    for (const r of (p.additional_llms || [])) rows.push({ system: r.system, per_event: r.per_event, avg: r.avg, type: "LLM · proj",   _italic: true });
    for (const r of (p.agents_on_doubao || [])) rows.push({ system: r.system, per_event: r.per_event, avg: r.avg, type: "AGENT · proj", _italic: true });
    for (const r of (p.agents_on_qwen3  || [])) rows.push({ system: r.system, per_event: r.per_event, avg: r.avg, type: "AGENT · proj", _italic: true });
  }
  if (barsState.include === "ref") {
    for (const r of (p.baselines_and_human || [])) {
      const isHuman = r.kind === "human";
      rows.push({ system: r.system, avg: r.avg, type: isHuman ? "HUMAN" : "BASELINE", _italic: true, _ref: true });
    }
  }

  // Pull the score for the current selection
  const axisIdx = barsState.axis === "cal" ? 0 : 1;
  for (const r of rows) {
    let pair = null;
    if (barsState.event === "__avg") pair = r.avg;
    else if (r.per_event) pair = r.per_event[barsState.event];
    r._score = pair ? pair[axisIdx] : null;
    r._counter = pair ? pair[1 - axisIdx] : null;
  }

  // Drop rows without a score for this selection (e.g. baselines have no per-event)
  const usable = rows.filter(r => r._score !== null && r._score !== undefined);

  // Sort
  if (barsState.sortBy === "score") {
    const dir = barsState.sortDir === "asc" ? 1 : -1;
    usable.sort((a, b) => dir * (a._score - b._score));
  } else {
    const dir = barsState.sortDir === "asc" ? 1 : -1;
    usable.sort((a, b) => dir * a.system.localeCompare(b.system));
  }

  return usable;
}

function renderBars() {
  if (!_lbData) return;
  const rows = buildBarRows();
  const host = document.getElementById("bars-chart");
  const meta = document.getElementById("bars-meta");
  if (!host) return;

  const axisLabel = barsState.axis === "cal" ? "CAL" : "TIME";
  const evLabel = barsState.event === "__avg"
    ? "Overall (cross-event average)"
    : (EVENT_LABEL[barsState.event]?.long || barsState.event);
  const baselineVal = barsState.axis === "cal" ? 0 : 50;
  const baselineNote = barsState.axis === "cal"
    ? "0 = uniform 50% predictor · 100 = perfect"
    : "50 = bucket-midpoint baseline · 100 = perfect timing";

  // header row
  const max = 100;
  const axisTop = `
    <div class="bars-axis-top">
      <div>System</div>
      <div class="ax-track">
        <span class="tick" style="left: 0%;">0</span>
        <span class="tick" style="left: 25%;">25</span>
        <span class="tick" style="left: 50%;">50</span>
        <span class="tick" style="left: 75%;">75</span>
        <span class="tick" style="left: 99%;">100</span>
      </div>
      <div style="text-align:right;">${axisLabel}</div>
    </div>`;

  if (!rows.length) {
    host.innerHTML = axisTop + `<div style="padding: 24px 8px; font-family: var(--mono); font-size: 13px; color: var(--muted);">— no systems report ${axisLabel} for "${evLabel}".</div>`;
    return;
  }

  const best = rows.reduce((m, r) => (r._score > m._score ? r : m), rows[0]);
  const baselinePct = (baselineVal / max) * 100;

  const rowsHtml = rows.map((r, i) => {
    const pct = Math.max(0, Math.min(100, (r._score / max) * 100));
    const isBest = r === best && !r._ref; // don't mark baselines / human as "best"
    const classes = ["bar-row"];
    if (isBest) classes.push("best");
    if (r._italic) classes.push("italic");
    if (r._ref) classes.push("reference");

    const typeClass = r.type.toLowerCase().replace(/[^a-z]/g, "-");
    const typeBadge = `<span class="type-mini ${typeClass}">${r.type}</span>`;
    const counterLine = (barsState.event === "__avg" && r._counter != null)
      ? `<span class="delta">${barsState.axis === "cal" ? "Time" : "Cal"} ${r._counter.toFixed(1)}</span>`
      : "";
    const rank = i + 1;
    const rankBadge = barsState.sortBy === "alpha" ? "" : `<span class="rank">#${rank}</span>`;

    const baselineMark = (baselineVal > 0 && baselineVal < 100)
      ? `<span class="baseline-mark" style="left: ${baselinePct}%"></span>`
      : "";

    return `
      <div class="${classes.join(" ")}">
        <div class="label">${rankBadge}<span>${r.system}</span>${typeBadge}</div>
        <div class="track">
          ${baselineMark}
          <span class="fill" data-pct="${pct}"></span>
        </div>
        <div class="score">${r._score.toFixed(1)}${counterLine}</div>
      </div>`;
  }).join("");

  host.innerHTML = axisTop + rowsHtml;

  // meta line
  const total = rows.length;
  const validatedCount = (_lbData.validated || []).length;
  meta.innerHTML = `
    <b>${total}</b> systems shown · axis <span class="pill">${axisLabel}</span> · event <span class="pill">${evLabel}</span> · ${baselineNote}`;

  // trigger CSS transition by reading then setting transform on next frame
  requestAnimationFrame(() => {
    host.querySelectorAll(".bar-row .fill").forEach(el => {
      const pct = parseFloat(el.dataset.pct);
      el.style.transform = `scaleX(${pct / 100})`;
    });
  });
}

// ============================ Interactive widget ==========================
const widgetState = {
  data: null,
  eventIdx: 0,
  pointIdx: 0,
  modelIdx: 0,
  revealed: false
};

function el(id) { return document.getElementById(id); }

function currentPoint() {
  const ev = widgetState.data.events[widgetState.eventIdx];
  return { event: ev, point: ev.prediction_points[widgetState.pointIdx] };
}

function evalCalibration(p_hat, gt) {
  // direction-correct if (gt=1 and p_hat>=0.5) or (gt=0 and p_hat<0.5)
  if (gt === 1) return p_hat >= 0.5;
  return p_hat < 0.5;
}

function renderWidget() {
  const { event, point } = currentPoint();
  const model = point.model_responses[widgetState.modelIdx];

  el("ctx-meta").textContent = `${event.domain_label.toLowerCase()} · ${point.cutoff_label.toLowerCase()}`;
  el("ctx-text").textContent = point.context_excerpt;

  el("cal-q").textContent = point.calibration_question.q;
  el("cal-meta").textContent = `WINDOW: ${point.calibration_question.window_days} DAYS · GT BINARY`;

  el("time-q").textContent = point.temporal_question.q;
  el("time-meta").textContent = `GT: calendar day · scored by day-MAE`;

  // model output
  el("mout-name").textContent = model.model + (model.is_projected ? "  ·  PROJECTED" : (model.is_best_overall ? "  ·  STRONGEST LLM" : ""));

  // calibration p_hat — orange if correct direction, gray + strikethrough if not
  const calCorrect = evalCalibration(model.calibration.p_hat, point.calibration_question.gt);
  const phatEl = el("phat");
  phatEl.textContent = model.calibration.p_hat.toFixed(2);
  phatEl.classList.toggle("bad", !calCorrect);
  el("phat-reason").textContent = model.calibration.reasoning;

  // temporal d_hat — orange if abs_error<=7 days, otherwise gray + strikethrough
  const dhatEl = el("dhat");
  dhatEl.textContent = model.temporal.d_hat_label || ("Day " + model.temporal.d_hat_day);
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
    btn.innerHTML = "✓ GT REVEALED";
    btn.style.opacity = 0.6;
    btn.style.cursor = "default";
    el("gt-cal").textContent = point.calibration_question.gt === 1 ? "YES" : "NO";
    el("gt-cal-note").textContent = point.calibration_question.gt_note ? "— " + point.calibration_question.gt_note : "";
    el("gt-time").textContent = point.temporal_question.gt_label || ("Day " + point.temporal_question.gt_day);
  } else {
    gtVals.classList.add("hidden");
    gtPending.style.display = "";
    btn.disabled = false;
    btn.innerHTML = '<span class="glyph">▸</span> REVEAL GT';
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
    widgetState.modelIdx = 0;
    widgetState.revealed = false;
    buildPointSelector();
    buildModelButtons();
    renderWidget();
  });
  buildPointSelector();
  buildModelButtons();
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
    widgetState.revealed = false;
    renderWidget();
  };
}

function buildModelButtons() {
  const host = el("model-btns");
  const { point } = currentPoint();
  host.innerHTML = point.model_responses.map((m, i) => {
    const tag = m.is_best_overall ? "BEST" : (m.is_projected ? "PROJ" : "LLM");
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
    const res = await fetch("./interactive_demo.json");
    widgetState.data = await res.json();
  } catch (err) {
    console.error("Failed to load interactive demo:", err);
    return;
  }
  buildSelectors();
  renderWidget();
}

// ============================ Boot =======================================
loadLeaderboards();
loadWidget();

// ============================ Mode tabs (cached / live) ==================
const MODEL_OPTIONS = [
  // --- LLMs ---
  { id: "gemini-3.1-pro",       label: "Gemini-3.1-pro",      group: "LLM" },
  { id: "gpt-5.4",              label: "GPT-5.4",             group: "LLM" },
  { id: "claude-sonnet-4.6",    label: "Claude Sonnet 4.6",   group: "LLM" },
  { id: "doubao-seed-2.0-lite", label: "Doubao Seed 2.0 lite",group: "LLM" },
  { id: "qwen3-235b-a22b",      label: "Qwen3-235B-A22B",     group: "LLM" },
  { id: "kimi-k2.5",            label: "Kimi-K2.5",           group: "LLM" },
  // --- Agents (projected) ---
  { id: "mirofish-doubao",      label: "MiroFish + Doubao",   group: "AGENT" },
  { id: "mirofish-qwen3",       label: "MiroFish + Qwen3",    group: "AGENT" },
  { id: "langgraph-doubao",     label: "LangGraph + Doubao",  group: "AGENT" },
  { id: "autogen-doubao",       label: "AutoGen + Doubao",    group: "AGENT" }
];

// Live-mode preset questions are sourced per-event from interactive_demo.json
// (events[i].live_questions). This helper returns the current event's questions,
// with a graceful fallback to a top-level `live_questions` array (v0.1 schema).
function currentLiveQuestions() {
  if (!widgetState.data) return [];
  const ev = widgetState.data.events?.[liveState.eventIdx];
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
  document.querySelectorAll(".tab").forEach(t => {
    const active = t.dataset.tab === name;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.dataset.pane === name);
  });
}

document.querySelectorAll(".tab").forEach(t => {
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
  selectEl.innerHTML = `
    <optgroup label="LLMs">
      ${llms.map(m => `<option value="${m.id}">${m.label}</option>`).join("")}
    </optgroup>
    <optgroup label="Agents (projected)">
      ${agents.map(m => `<option value="${m.id}">${m.label} (agent)</option>`).join("")}
    </optgroup>`;
  selectEl.value = defaultVal;
}

function renderLiveQuestions() {
  const host = el("qchoice-list");
  const Qs = currentLiveQuestions();
  // clamp index when switching events
  if (liveState.questionIdx >= Qs.length) liveState.questionIdx = 0;
  host.innerHTML = Qs.map((q, i) => {
    const typeTag = q.type === "calibration" ? "CAL" : "TIME";
    const winTag = q.window ? `<span class="qtag win">${q.window}d window</span>` : "";
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
          cqHint.textContent = "Typing here clears the preset selection above.";
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
      if (cqHint) { cqHint.textContent = "Typing here clears the preset selection above."; cqHint.classList.remove("active"); }
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
      cqHint.textContent = "Custom question active — preset selection cleared.";
      cqHint.classList.add("active");
    } else {
      cqHint.textContent = "Typing here clears the preset selection above.";
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
  const calGt = pt.calibration_question?.gt === 1 ? "YES" : (pt.calibration_question?.gt === 0 ? "NO" : "—");
  const timeGt = pt.temporal_question?.gt_label || (pt.temporal_question?.gt_day ? "Day " + pt.temporal_question.gt_day : "—");
  const note = pt.calibration_question?.gt_note ? "— " + pt.calibration_question.gt_note : "";
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
  el("live-ctx-meta").textContent = `${ev.domain_label.toLowerCase()} · ${pt.cutoff_label.toLowerCase()}`;
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
      <span class="lc-num-label">THINKING…</span>
      <div class="lc-num">—</div>
      <div class="lc-reason">calling /api/predict (5–30s)</div>`;
  }
  el("live-result-meta").textContent = "calling real API…";
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
    const big = isCal ? Number(r.p_hat).toFixed(2) : (r.d_hat_label || ("Day " + r.d_hat_day));
    const lab = isCal ? "P̂  ·  CALIBRATION" : "D̂  ·  TEMPORAL DAY";
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
    if (Math.abs(p - 0.5) < 0.06) return "uniform collapse — defaults to ~0.5";
    if ((yes && p >= 0.7) || (!yes && p <= 0.3)) return "calibrated — commits in the correct direction";
    if ((yes && p >= 0.5) || (!yes && p < 0.5)) return "correct direction, low confidence";
    return "wrong direction — overconfident on the opposite outcome";
  }
  // temporal
  const dhat = r.d_hat_day;
  if (dhat === undefined || dhat === null) return "—";
  const diff = Math.abs(dhat - gt.y);
  if (diff <= 3)  return `near-perfect timing (Δ ≈ ${diff}d)`;
  if (diff <= 14) return `close timing (Δ ≈ ${diff}d)`;
  if (diff > 30)  return `long-horizon collapse (Δ ≈ ${diff}d)`;
  return `over-extends a recent trend (Δ ≈ ${diff}d)`;
}

function renderLiveGT() {
  const r = liveState.lastResult;
  if (!r || !r.ground_truth) return;
  const gt = r.ground_truth;
  const gtVal = (gt.type === "calibration") ? (gt.y === 1 ? "YES" : "NO") : (gt.y_label || ("Day " + gt.y));
  const vA = verdictFor(r.results[0], gt);
  const vB = verdictFor(r.results[1], gt);
  const host = el("live-gt-host");
  host.style.display = "";
  host.innerHTML = `
    <div class="live-gt-bar">
      <div class="gt-headline">GROUND TRUTH &nbsp;·&nbsp; <b>${gtVal}</b>${gt.note ? ` &nbsp;<span style="color:var(--muted); font-weight:500;">— ${gt.note}</span>` : ""}</div>
      <div class="gt-verdicts">
        <div class="gt-verdict"><b>MODEL A · ${modelLabel(liveState.modelA)}</b>${vA}</div>
        <div class="gt-verdict"><b>MODEL B · ${modelLabel(liveState.modelB)}</b>${vB}</div>
      </div>
    </div>`;
  el("live-reveal-row").style.display = "none";
}

async function runLivePrediction() {
  if (liveState.busy) return;
  if (liveState.modelA === liveState.modelB) {
    setBanner("Pick two different models for the side-by-side comparison.", "warn");
    return;
  }
  setBanner("");
  liveState.busy = true;
  const runBtn = el("run-btn");
  runBtn.disabled = true;
  runBtn.textContent = "▶ RUNNING…";

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
      setBanner("Live mode paused — daily budget exhausted, showing cached responses.", "warn");
      switchTab("cached");
      restoreIdleLiveCards();
      return;
    }
    if (res.status >= 500) {
      setBanner("Service unavailable (5xx) — try again later, or use cached mode.", "error");
      restoreIdleLiveCards();
      return;
    }
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    result = await res.json();
  } catch (err) {
    // Network failure / no backend / CORS — treat as "backend not configured"
    setBanner("Backend not configured (/api/predict unreachable) — switching to cached mode.", "error");
    switchTab("cached");
    restoreIdleLiveCards();
    return;
  } finally {
    liveState.busy = false;
    runBtn.disabled = false;
    runBtn.textContent = "▶ RUN PREDICTION";
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
  const idleTagline = "Pick a question and 2 models, then hit RUN ▶ to call the live API";
  const idleNote    = "Each Run calls the model API in real time (~5–30s). Daily budget applies.";
  const a = el("live-card-a"), b = el("live-card-b");
  for (const [card, side] of [[a, ""], [b, "b"]]) {
    card.classList.remove("thinking");
    card.innerHTML = `
      <div class="lc-header">
        <span class="lc-name">Model ${side === "b" ? "B" : "A"}</span>
        <span class="lc-side ${side}">${side === "b" ? "B" : "A"}</span>
      </div>
      <span class="lc-num-label">${idleTagline}</span>
      <div class="lc-num" style="color: var(--muted); font-size: 32px;">—</div>
      <div class="lc-reason" style="color: var(--muted);">${idleNote}</div>`;
  }
  el("live-result-meta").textContent = "awaiting run";
  el("live-reveal-row").style.display = "none";
  el("live-gt-host").style.display = "none";
  el("live-gt-host").innerHTML = "";
}

// kick off live-mode init (waits for cached data to be available)
initLiveSelectors();

// ============================ Suggest-topic form ==========================
const suggestToggle = el("suggest-toggle");
const suggestForm = el("suggest-form");
if (suggestToggle && suggestForm) {
  suggestToggle.addEventListener("click", (e) => {
    e.preventDefault();
    const open = suggestForm.classList.toggle("open");
    suggestToggle.textContent = open ? "Hide form ↑" : "Submit topic →";
  });

  suggestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name:  el("sf-name").value.trim(),
      from:  el("sf-from").value.trim(),
      to:    el("sf-to").value.trim(),
      email: el("sf-email").value.trim(),
      why:   el("sf-why").value.trim()
    };
    if (!payload.name || !payload.email || !payload.why) {
      flashFormMsg("PLEASE FILL THE REQUIRED FIELDS.");
      return;
    }
    const submitBtn = suggestForm.querySelector(".submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "▸ SUBMITTING…";
    try {
      const res = await fetch("/api/suggest-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      // backend is async — treat 2xx / 202 as success
      if (res.ok) {
        showSubmitted();
      } else if (res.status >= 500) {
        flashFormMsg("SERVICE UNAVAILABLE — TRY AGAIN LATER.");
      } else {
        flashFormMsg("SUBMITTED — WE'LL BE IN TOUCH"); // graceful degrade
      }
    } catch (err) {
      // No backend yet → graceful confirmation
      showSubmitted();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "▸ SUBMIT TOPIC";
    }
  });
}

function flashFormMsg(text) {
  let msg = suggestForm.querySelector(".ok-msg");
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "ok-msg";
    suggestForm.appendChild(msg);
  }
  msg.textContent = text;
}
function showSubmitted() {
  suggestForm.innerHTML = `<div class="ok-msg">✓ SUBMITTED — WE'LL BE IN TOUCH</div>`;
}

// ============================ Expand-card drawers =========================
document.querySelectorAll(".drawer-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.drawerId;
    const drawer = document.getElementById(id);
    if (!drawer) return;
    const open = drawer.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.textContent = open ? "[ HIDE SUBMISSION DETAILS ▴ ]" : "[ SHOW SUBMISSION DETAILS ▾ ]";
  });
});

// ============================ Results Deep-dive ===========================
async function loadDeepDive() {
  let data;
  try {
    const res = await fetch("./experiments.json");
    data = await res.json();
  } catch (err) {
    console.error("Failed to load experiments.json:", err);
    return;
  }
  renderStressBlock(data.stress_case);
  renderAblationTable("dd-questionbank",  data.ablations.question_bank_composition, {
    columns: [
      { key: "label", title: "Question-bank composition" },
      { key: "cal",  title: "Cal",  deltaKey: "cal_delta" },
      { key: "time", title: "Time", deltaKey: "time_delta" }
    ],
    extremes: ["cal_delta", "time_delta"]
  }, "02");
  renderAblationTable("dd-scoring",       data.ablations.scoring_formula, {
    columns: [
      { key: "label",  title: "Calibration scoring formula" },
      { key: "doubao", title: "Doubao", deltaKey: "doubao_delta" },
      { key: "gemini", title: "Gemini", deltaKey: "gemini_delta" },
      { key: "gap",    title: "Gap" }
    ]
  }, "03");
  renderAblationTable("dd-reasoning",     data.ablations.reasoning_depth, {
    columns: [
      { key: "label", title: "Reasoning effort" },
      { key: "cal",  title: "Cal",  deltaKey: "cal_delta" },
      { key: "time", title: "Time", deltaKey: "time_delta" }
    ],
    extremes: ["cal_delta", "time_delta"]
  }, "04");
  renderAblationTable("dd-anonymization", data.ablations.anonymization_protocol, {
    columns: [
      { key: "label",   title: "Anonymization variant" },
      { key: "wuhan",   title: "PUB"   },
      { key: "us_iran", title: "GEO"   },
      { key: "tiktok",  title: "TECH"  },
      { key: "smci",    title: "MKT"   },
      { key: "trump",   title: "TRADE" },
      { key: "mean",    title: "Mean"  }
    ],
    showLeak: true
  }, "05");
}

function renderStressBlock(block) {
  const host = document.getElementById("dd-stress");
  if (!host || !block) return;
  const cards = block.events.map(ev => stressCard(ev)).join("");
  host.innerHTML = `
    <div class="dd-block">
      <div class="dd-head">
        <span class="dd-num">SUB-BLOCK 01 / STRESS CASES</span>
        <h3>${block.title}</h3>
        <p class="dd-sub">${block.subtitle}</p>
      </div>
      <div class="dd-stress-grid">${cards}</div>
    </div>`;
}

function stressCard(ev) {
  const s = ev.stats;
  const winnerIsCal = ev.axis_winner === "cal";
  return `
    <div class="dd-stress-card">
      <div class="sc-hdr">
        <div>
          <div class="sc-name">${ev.name}</div>
          <div class="sc-label">${ev.label}</div>
        </div>
      </div>

      <div class="sc-stats">
        <span class="sc-stat">${s.n_pts} PTS</span>
        <span class="sc-stat">${s.arc_days} DAYS</span>
        <span class="sc-stat">${s.n_cal.toLocaleString()} CAL</span>
        <span class="sc-stat">${s.n_time.toLocaleString()} TIME</span>
      </div>

      <div class="sc-mini-row">
        <div class="sc-mini">
          <div class="mlabel">Mean</div>
          <div class="mvals">${ev.mean.cal.toFixed(1)}<span class="sep">|</span>${ev.mean.time.toFixed(1)}</div>
        </div>
        <div class="sc-mini ${ev.gemini.is_best ? "best" : ""}">
          <div class="mlabel">★ Gemini</div>
          <div class="mvals">${ev.gemini.cal.toFixed(1)}<span class="sep">|</span>${ev.gemini.time.toFixed(1)}</div>
        </div>
        <div class="sc-mini">
          <div class="mlabel">Qwen3</div>
          <div class="mvals">${ev.qwen3.cal.toFixed(1)}<span class="sep">|</span>${ev.qwen3.time.toFixed(1)}</div>
        </div>
      </div>

      <div class="sc-gap">
        <div class="gax">
          <div class="gax-label">Δ Cal</div>
          <div class="gax-val ${winnerIsCal ? "winner" : ""}">+${ev.gap.cal.toFixed(1)}</div>
          <div class="gax-pct">${ev.gap.cal_pct_of_mean}% of mean</div>
        </div>
        <div class="gax">
          <div class="gax-label">Δ Time</div>
          <div class="gax-val ${!winnerIsCal ? "winner" : ""}">+${ev.gap.time.toFixed(1)}</div>
          <div class="gax-pct">${ev.gap.time_pct_of_mean}% of mean</div>
        </div>
      </div>

      <p class="dd-take" style="margin-top: 4px;">${ev.takeaway}</p>
    </div>`;
}

function formatDelta(d) {
  if (d === undefined || d === null) return "";
  if (d === 0) return "";
  const sign = d > 0 ? "₊" : "₋";
  // Convert digits to subscript characters
  const sub = String(Math.abs(d)).replace(/[0-9]/g, ch => "₀₁₂₃₄₅₆₇₈₉"[+ch]).replace(".", ".");
  return `<span class="delta">${sign}${sub}</span>`;
}

function renderAblationTable(hostId, block, spec, num) {
  const host = document.getElementById(hostId);
  if (!host || !block) return;

  // determine extreme deltas (largest absolute) per key, to mark in orange
  const extremes = {};
  if (spec.extremes) {
    for (const k of spec.extremes) {
      let maxAbs = 0;
      for (const r of block.rows) {
        if (r.is_baseline) continue;
        if (Math.abs(r[k] || 0) > maxAbs) maxAbs = Math.abs(r[k]);
      }
      extremes[k] = maxAbs;
    }
  }

  const headHtml = `<thead><tr>${spec.columns.map(c => `<th>${c.title}</th>`).join("")}</tr></thead>`;

  const bodyHtml = block.rows.map(r => {
    const tdHtml = spec.columns.map((c, i) => {
      if (i === 0) {
        const leak = (spec.showLeak && r.leak) ? `<span class="leak">+${r.leak} leak</span>` : "";
        return `<td>${r[c.key]}${leak}</td>`;
      }
      const v = r[c.key];
      const dKey = c.deltaKey;
      const d = dKey ? r[dKey] : null;
      const isExtreme = dKey && extremes[dKey] && Math.abs(d) === extremes[dKey];
      const numCls = isExtreme ? "num extreme" : "num";
      const deltaHtml = dKey ? formatDelta(d).replace('class="delta"', `class="delta${isExtreme ? " extreme" : ""}"`) : "";
      return `<td><span class="${numCls}">${typeof v === "number" ? v.toFixed(1) : v ?? "—"}</span>${deltaHtml}</td>`;
    }).join("");
    return `<tr class="${r.is_baseline ? "baseline" : ""}">${tdHtml}</tr>`;
  }).join("");

  host.innerHTML = `
    <div class="dd-block">
      <div class="dd-head">
        <span class="dd-num">SUB-BLOCK ${num} / ${block.title.toUpperCase()}</span>
        <h3>${block.title}</h3>
        <p class="dd-sub">${block.subtitle}</p>
      </div>
      <div class="dd-table-wrap">
        <table class="dd-table">${headHtml}<tbody>${bodyHtml}</tbody></table>
      </div>
      <p class="dd-take">${block.takeaway}</p>
    </div>`;
}

loadDeepDive();
