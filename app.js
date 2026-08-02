/* SocietyBench — landing page interactions */

// ============================ i18n helpers ===============================
// Read translations from the global window.SB_I18N (defined in i18n.js, which
// is loaded before app.js). All dynamic strings emitted from this file go
// through t(key) so they flip when the user toggles the language.
function t(key, fallback) {
  if (window.SB_I18N && typeof window.SB_I18N.t === "function") return window.SB_I18N.t(key);
  return fallback != null ? fallback : key;
}
function currentLang() {
  if (window.SB_I18N && typeof window.SB_I18N.getLang === "function") return window.SB_I18N.getLang();
  return "en";
}
// Pick the right JSON file for the current language. "leaderboard" + "zh"
// becomes "./leaderboard.zh.json"; English defaults to "./leaderboard.json".
function dataUrl(name) {
  const lang = currentLang();
  return lang === "zh" ? `./${name}.zh.json` : `./${name}.json`;
}
// Tiny templating helper — replaces {key} tokens with values from a map.
function tfmt(tmpl, vars) {
  return String(tmpl).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ""));
}

// ======================== Anchor nav + scroll-spy =========================
// The page is one long scroll: nav links are in-page anchors. An
// IntersectionObserver highlights whichever section is currently in view so the
// user always knows where they are in the document.
function el(id) { return document.getElementById(id); }

const SPY_IDS = ["about", "abstract", "method", "leaderboard", "expand", "cite"];
// Hero, abstract and method all roll up under the "Overview" nav item.
const SPY_TO_NAV = { about: "about", abstract: "about", method: "about", leaderboard: "leaderboard", expand: "expand", cite: "cite" };
function setActiveNav(navKey) {
  document.querySelectorAll(".topnav-links a.sb-link[data-spy]").forEach(a => {
    a.classList.toggle("active", a.dataset.spy === navKey);
  });
}

(function initScrollSpy() {
  const targets = SPY_IDS.map(id => document.getElementById(id)).filter(Boolean);
  if (!targets.length) return;

  // Scroll POSITION is the mechanism, and the trigger is a polling timer rather
  // than scroll/rAF: some embedded renderers deliver neither, and a latch that
  // only clears inside a rAF callback would freeze the highlight permanently.
  // Timers always fire, and a nav highlight does not need frame accuracy.
  const NAV_LINE = 120;
  let lastKey = null;
  function update() {
    const y = (document.scrollingElement || document.documentElement).scrollTop + NAV_LINE;
    let current = targets[0].id;
    for (const sec of targets) {
      if (sec.offsetTop <= y) current = sec.id;
      else break;
    }
    // Near the very bottom the last section may never cross the line.
    if (window.innerHeight + window.pageYOffset >= document.body.scrollHeight - 4) {
      current = targets[targets.length - 1].id;
    }
    const key = SPY_TO_NAV[current] || current;
    if (key === lastKey) return;
    lastKey = key;
    setActiveNav(key);
  }
  update();
  setInterval(update, 200);
  // Accelerators — harmless when they never fire.
  window.addEventListener("scroll", update, { passive: true });
  document.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
})();

// Clicking a nav anchor for the section you're already in should still take you
// to its top (the browser skips the jump when the hash is unchanged).
document.addEventListener("click", (e) => {
  const link = e.target.closest('.topnav a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute("href").slice(1);
  const target = id === "top" ? document.body : document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  if (id === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", location.pathname);
    return;
  }
  const y = target.getBoundingClientRect().top + window.pageYOffset - 76;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  history.replaceState(null, "", "#" + id);
});

// ============================ Event label map ============================
// Keep table column labels anonymized: no real names anywhere in rendered UI.
// `short` stays English (it's an in-table column code, shared across languages).
// `longKey` points into the i18n dictionary so the long name follows the lang.
const EVENT_LABEL = {
  "Wuhan Lib.":   { short: "PUB",   longKey: "events.c01.title" },
  "US-Iran":      { short: "GEO",   longKey: "events.c04.title" },
  "TikTok":       { short: "TECH",  longKey: "events.c03.title" },
  "SMCI":         { short: "MKT",   longKey: "events.c05.title" },
  "Trump Tariff": { short: "TRADE", longKey: "events.c02.title" }
};
function eventLongLabel(key) {
  const e = EVENT_LABEL[key];
  return e ? t(e.longKey, key) : key;
}
// Map English type-badge strings (LLM / AGENT · proj / HUMAN / …) to their
// localized display label. The original English string is still used to derive
// the CSS class so colour styling stays intact.
const TYPE_KEY = {
  "LLM":          "js.lb.type.llm",
  "AGENT":        "js.lb.type.agent",
  "LLM · proj":   "js.lb.type.llm-proj",
  "AGENT · proj": "js.lb.type.agent-proj",
  "HUMAN":        "js.lb.type.human",
  "BASELINE":     "js.lb.type.baseline"
};
function typeLabel(typ) {
  const k = TYPE_KEY[typ];
  return k ? t(k, typ) : typ;
}

// ============================ Reveal on scroll ============================
// The reveal animation is a nicety, never a gate on visibility: if the observer
// never fires (some embedded/preview renderers don't deliver IO callbacks) the
// page must still paint. So we arm a short fallback that reveals everything.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  }
}, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));
setTimeout(() => { document.querySelectorAll(".reveal:not(.in)").forEach(el => el.classList.add("in")); }, 600);

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
  copyBtn.textContent = t("js.bib.copied");
  setTimeout(() => {
    copyBtn.classList.remove("copied");
    copyBtn.textContent = t("cite.copy");
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
  // Every row in `validated` is a measured result; the row's own `kind` says
  // what kind of system it is. Baselines sink to the bottom because they are a
  // reference line rather than a competitor; LLMs and agents rank together,
  // which is the comparison the agent tables are actually about.
  const TYPE = { llm: "LLM", agent: "AGENT", baseline: "BASELINE", human: "HUMAN" };
  const rank = r => (r.kind === "baseline" || r.kind === "human") ? 1 : 0;
  const rows = (data.validated || []).slice()
    .sort((a, b) => (rank(a) - rank(b)) || ((b.avg?.[0] || 0) - (a.avg?.[0] || 0)))
    .map(r => Object.assign({}, r, {
      _type: TYPE[r.kind] || "LLM",
      _italic: false,
      _reference: r.kind === "baseline" || r.kind === "human",
      _ref: r.kind === "baseline" || r.kind === "human"
    }));

  // Kept for backward compatibility: if a future release ever ships projected
  // numbers again, they still render, italic and badged.
  const p = data.projected || {};
  rows.push(...rowsForType(p.additional_llms  || [], "LLM · proj",   { italic: true }));
  rows.push(...rowsForType(p.agents_on_doubao || [], "AGENT · proj", { italic: true }));
  rows.push(...rowsForType(p.agents_on_qwen3  || [], "AGENT · proj", { italic: true }));
  for (const r of (p.baselines_and_human || [])) {
    const kind = r.kind === "human" ? "HUMAN" : "BASELINE";
    rows.push(Object.assign({}, r, { _type: kind, _italic: true, _reference: kind === "HUMAN" }));
  }
  return rows;
}

function buildUnifiedHeader(events) {
  const sub = t("js.lb.cell.subhead");
  const cols = events.map(e => {
    const lbl = EVENT_LABEL[e] || { short: e };
    return `<th title="${eventLongLabel(e)}">${lbl.short}<span class="sub">${sub}</span></th>`;
  }).join("");
  return `
    <thead>
      <tr>
        <th class="sys-col">${t("js.lb.header.system")}</th>
        <th class="type-col">${t("js.lb.header.type")}</th>
        ${cols}
        <th>${t("js.lb.header.avg")}<span class="sub">${sub}</span></th>
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

  // Type column: badge style (CSS class derived from original English type)
  const typeBadgeClass = "type-badge " + r._type.toLowerCase().replace(/[^a-z]/g, "-");
  tr.push(`<td class="type"><span class="${typeBadgeClass}">${typeLabel(r._type)}</span></td>`);

  if (r.kind && !r.per_event) {
    tr.push(`<td colspan="${events.length}" class="not-reported">${tfmt(t("js.lb.cell.notreported.fmt"), { kind: r.kind })}</td>`);
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
  // Real counts, per language edition, from the released banks. Points are 25
  // for every event by construction; the question volumes differ because the
  // timelines do.
  { key: "Wuhan Lib.",   numeral: "01", domain: "Public Controversy",    arc: "Online dispute at a major university.",                     n_pts: 25, n_cal: 2862, n_time: 534 },
  { key: "Trump Tariff", numeral: "02", domain: "Trade Policy",          arc: "Reciprocal-tariff escalation between two major economies.", n_pts: 25, n_cal: 8035, n_time: 976 },
  { key: "TikTok",       numeral: "03", domain: "Technology Policy",     arc: "National divestiture / ban ruling on an online platform.",  n_pts: 25, n_cal: 6697, n_time: 571 },
  { key: "US-Iran",      numeral: "04", domain: "Geopolitical Conflict", arc: "Cross-border military confrontation between two states.",   n_pts: 25, n_cal: 4574, n_time: 503 },
  { key: "SMCI",         numeral: "05", domain: "Financial Markets",     arc: "Delisting crisis of an exchange-listed firm.",              n_pts: 25, n_cal: 3196, n_time: 528 }
];

function renderEventsTab() {
  const host = document.getElementById("lb-events-grid");
  if (!host) return;
  host.innerHTML = EVENT_CARDS.map(c => `
    <article class="card lb-event-card">
      <div class="numeral">${c.numeral}</div>
      <div class="domain">${eventLongLabel(c.key)}</div>
      <div class="arc">${t("events.c" + c.numeral + ".body", c.arc)}</div>
      <div class="chips">
        <span class="chip">${tfmt(t("js.lb.events.chip.pts.fmt"), { n: c.n_pts })}</span>
        <span class="chip">${tfmt(t("js.lb.events.chip.cal.fmt"), { n: c.n_cal.toLocaleString() })}</span>
        <span class="chip">${tfmt(t("js.lb.events.chip.time.fmt"), { n: c.n_time.toLocaleString() })}</span>
      </div>
    </article>
  `).join("");
}

async function loadLeaderboards() {
  let data;
  try {
    const res = await fetch(dataUrl("leaderboard"));
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
if (document.querySelector("[data-lbtab]")) wireLbTabs();

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
  fetch(dataUrl("leaderboard")).then(r => r.json()).then(d => {
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
if (document.getElementById("bars-chart")) loadAllLbData();

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
if (document.getElementById("bars-chart")) wireBarsControls();

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

  const axisLabel = barsState.axis === "cal" ? t("js.bars.axis.cal") : t("js.bars.axis.time");
  const evLabel = barsState.event === "__avg"
    ? t("js.bars.overall.label")
    : eventLongLabel(barsState.event);
  const baselineVal = barsState.axis === "cal" ? 0 : 50;
  const baselineNote = barsState.axis === "cal"
    ? t("js.bars.baseline.cal")
    : t("js.bars.baseline.time");

  // header row
  const max = 100;
  const axisTop = `
    <div class="bars-axis-top">
      <div>${t("js.lb.header.system")}</div>
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
    host.innerHTML = axisTop + `<div style="padding: 24px 8px; font-family: var(--mono); font-size: 13px; color: var(--muted);">${tfmt(t("js.bars.empty.fmt"), { axis: axisLabel, event: evLabel })}</div>`;
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
    const typeBadge = `<span class="type-mini ${typeClass}">${typeLabel(r.type)}</span>`;
    const counterLine = (barsState.event === "__avg" && r._counter != null)
      ? `<span class="delta">${barsState.axis === "cal" ? t("js.bars.counter.time") : t("js.bars.counter.cal")} ${r._counter.toFixed(1)}</span>`
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
  meta.innerHTML = tfmt(t("js.bars.meta.fmt.html"), {
    n: total,
    axis: axisLabel,
    event: evLabel,
    note: baselineNote
  });

  // trigger CSS transition by reading then setting transform on next frame
  requestAnimationFrame(() => {
    host.querySelectorAll(".bar-row .fill").forEach(el => {
      const pct = parseFloat(el.dataset.pct);
      el.style.transform = `scaleX(${pct / 100})`;
    });
  });
}

// ============================ Suggest-topic form ==========================
const suggestToggle = el("suggest-toggle");
const suggestForm = el("suggest-form");
if (suggestToggle && suggestForm) {
  suggestToggle.addEventListener("click", (e) => {
    e.preventDefault();
    const open = suggestForm.classList.toggle("open");
    suggestToggle.textContent = open ? t("js.suggest.hide") : t("cb.c3.action");
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
      flashFormMsg(t("js.suggest.required"));
      return;
    }
    const submitBtn = suggestForm.querySelector(".submit");
    submitBtn.disabled = true;
    submitBtn.textContent = t("js.suggest.submitting");
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
        flashFormMsg(t("js.suggest.unavailable"));
      } else {
        flashFormMsg(t("js.suggest.submitted.text")); // graceful degrade
      }
    } catch (err) {
      // No backend yet → graceful confirmation
      showSubmitted();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t("cb.sf.submit");
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
  suggestForm.innerHTML = t("js.suggest.submitted.html");
}

// ============================ Expand-card drawers =========================
document.querySelectorAll(".drawer-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.drawerId;
    const drawer = document.getElementById(id);
    if (!drawer) return;
    const open = drawer.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.textContent = open ? t("js.drawer.hide") : t("js.drawer.show");
  });
});

// ============================ Results Deep-dive ===========================
async function loadDeepDive() {
  let data;
  try {
    const res = await fetch(dataUrl("experiments"));
    data = await res.json();
  } catch (err) {
    console.error("Failed to load experiments.json:", err);
    return;
  }
  renderStressBlock(data.stress_case);
  // Question-bank composition, scoring formula and true/false bias are three
  // views of the same question -- where the difficulty comes from -- so they
  // share one block and the buttons swap the table.
  renderAblationTabs("dd-ablations", [
    { block: data.ablations.question_bank_composition, spec: {
        columns: [
          { key: "label",  title: t("js.dd.col.qb-comp") },
          { key: "doubao", title: "Doubao", deltaKey: "doubao_delta" },
          { key: "gpt",    title: "GPT-5.5", deltaKey: "gpt_delta" },
          { key: "mean",   title: t("js.dd.col.mean"), deltaKey: "mean_delta" }
        ],
        extremes: ["mean_delta"]
      } },
    { block: data.ablations.scoring_formula, spec: {
        columns: [
          { key: "label",  title: t("js.dd.col.scoring-formula") },
          { key: "doubao", title: "Doubao", deltaKey: "doubao_delta" },
          { key: "gpt",    title: "GPT-5.5", deltaKey: "gpt_delta" },
          { key: "gap",    title: t("js.dd.col.gap") }
        ]
      } },
    { block: data.ablations.true_false_bias, spec: {
        columns: [
          { key: "label",  title: t("js.dd.col.qb-comp") },
          { key: "doubao", title: "Doubao" },
          { key: "dseek",  title: "DSeek" },
          { key: "opus",   title: "Opus" },
          { key: "gemini", title: "Gemini" },
          { key: "gpt",    title: "GPT-5.5" },
          { key: "mean",   title: t("js.dd.col.mean") }
        ]
      } }
  ]);
  renderAblationTable("dd-anonymization", data.ablations.cutoff_gradient, {
    columns: [
      { key: "label",  title: t("js.dd.col.qb-comp") },
      { key: "doubao", title: "Doubao" },
      { key: "opus",   title: "Opus" },
      { key: "gemini", title: "Gemini" },
      { key: "gpt",    title: "GPT-5.5" },
      { key: "mean",   title: t("js.dd.col.mean") }
    ]
  }, "05");
}

// The single most load-bearing piece of evidence on the page: how much the
// score inflates when anonymization is switched off. Drawn as bars, not a
// table — a reader should get it at a glance.
function renderValidity(block) {
  const host = document.getElementById("dd-validity");
  if (!host || !block) return;
  const rows = block.rows || [];
  if (!rows.length) return;
  const ours = rows.find(r => r.is_baseline) || rows[0];
  const raw = rows.reduce((a, b) => (b.mean > (a?.mean ?? -1) ? b : a), null);
  const gap = (raw.mean - ours.mean).toFixed(1);
  const max = Math.max(...rows.map(r => r.mean)) * 1.12;
  const bars = rows.map(r => {
    const pct = (r.mean / max) * 100;
    const isOurs = r === ours;
    return `<div class="vb-row${isOurs ? " is-ours" : ""}">
      <span class="vb-name">${r.label}</span>
      <span class="vb-track"><span class="vb-fill" style="width:${pct.toFixed(1)}%"></span></span>
      <span class="vb-val">${r.mean.toFixed(1)}${r.leak ? `<i class="vb-leak">+${r.leak}</i>` : ""}</span>
    </div>`;
  }).join("");
  host.innerHTML = `<h3 class="subsection-title vb-title">${t("dd.validity.title")}</h3>
    <p class="vb-lede">${t("dd.validity.lede")}</p>
    <div class="vb-chart">${bars}</div>
    <p class="vb-conclusion">${tfmt(t("dd.validity.conclusion"), { gap })}</p>
    <p class="vb-more">${t("dd.validity.more")}</p>`;
}

function renderStressBlock(block) {
  const host = document.getElementById("dd-stress");
  if (!host || !block) return;
  const cards = block.events.map(ev => stressCard(ev)).join("");
  host.innerHTML = `
    <div class="dd-block">
      <div class="dd-head dd-head-center">
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
        <span class="sc-stat">${s.n_pts} ${t("js.dd.sc.stat.pts")}</span>
        <span class="sc-stat">${s.arc_days} ${t("js.dd.sc.stat.days")}</span>
        <span class="sc-stat">${s.n_cal.toLocaleString()} ${t("js.dd.sc.stat.cal")}</span>
        <span class="sc-stat">${s.n_time.toLocaleString()} ${t("js.dd.sc.stat.time")}</span>
      </div>

      <div class="sc-mini-row">
        <div class="sc-mini">
          <div class="mlabel">${t("js.dd.sc.mean")}</div>
          <div class="mvals">${ev.mean.cal.toFixed(1)}<span class="sep">|</span>${ev.mean.time.toFixed(1)}</div>
        </div>
        <div class="sc-mini ${ev.gemini.is_best ? "best" : ""}">
          <div class="mlabel">★ ${ev.gemini.label || "—"}</div>
          <div class="mvals">${ev.gemini.cal.toFixed(1)}<span class="sep">|</span>${ev.gemini.time.toFixed(1)}</div>
        </div>
        <div class="sc-mini">
          <div class="mlabel">${ev.qwen3.label || "—"}</div>
          <div class="mvals">${ev.qwen3.cal.toFixed(1)}<span class="sep">|</span>${ev.qwen3.time.toFixed(1)}</div>
        </div>
      </div>

      <div class="sc-gap">
        <div class="gax">
          <div class="gax-label">${t("js.dd.sc.gap.cal")}</div>
          <div class="gax-val ${winnerIsCal ? "winner" : ""}">+${ev.gap.cal.toFixed(1)}</div>
          <div class="gax-pct">${tfmt(t("js.dd.sc.pct-of-mean.fmt"), { pct: ev.gap.cal_pct_of_mean })}</div>
        </div>
        <div class="gax">
          <div class="gax-label">${t("js.dd.sc.gap.time")}</div>
          <div class="gax-val ${!winnerIsCal ? "winner" : ""}">+${ev.gap.time.toFixed(1)}</div>
          <div class="gax-pct">${tfmt(t("js.dd.sc.pct-of-mean.fmt"), { pct: ev.gap.time_pct_of_mean })}</div>
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

function renderAblationTableSkipped() { /* superseded by renderValidity() */ }

// Three ablations in one block: the buttons swap the table and the takeaway.
function renderAblationTabs(hostId, items) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const live = items.filter(x => x.block);
  if (!live.length) return;
  const state = { i: 0 };

  host.innerHTML = `
    <div class="dd-block">
      <div class="dd-head dd-head-center">
        <h3 id="${hostId}-title"></h3>
        <p class="dd-sub" id="${hostId}-sub"></p>
      </div>
      <div class="tabs dd-tabs" role="tablist">
        ${live.map((x, i) => `<button type="button" class="tab${i ? "" : " active"}" role="tab"
            aria-selected="${i ? "false" : "true"}" data-i="${i}"><span class="glyph">▸</span><span>[ ${x.block.title.toUpperCase()} ]</span></button>`).join("")}
      </div>
      <div id="${hostId}-body"></div>
    </div>`;

  const paint = () => {
    const { block, spec } = live[state.i];
    document.getElementById(`${hostId}-title`).textContent = block.title;
    document.getElementById(`${hostId}-sub`).textContent = block.subtitle;
    document.getElementById(`${hostId}-body`).innerHTML = `
      <div class="dd-table-wrap">
        <table class="dd-table">${ablationTableHtml(block, spec)}</table>
      </div>
      <p class="dd-take">${block.takeaway}</p>`;
    host.querySelectorAll(".dd-tabs .tab").forEach((b, i) => {
      b.classList.toggle("active", i === state.i);
      b.setAttribute("aria-selected", i === state.i ? "true" : "false");
    });
  };
  host.querySelectorAll(".dd-tabs .tab").forEach(b => {
    b.addEventListener("click", () => { state.i = parseInt(b.dataset.i, 10); paint(); });
  });
  paint();
}

// The <thead> + <tbody> of an ablation table, shared by the single-table and
// the tabbed renderers.
function ablationTableHtml(block, spec) {
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
        const leak = (spec.showLeak && r.leak) ? `<span class="leak">${tfmt(t("js.dd.leak.fmt"), { leak: r.leak })}</span>` : "";
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
  return `${headHtml}<tbody>${bodyHtml}</tbody>`;
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
        const leak = (spec.showLeak && r.leak) ? `<span class="leak">${tfmt(t("js.dd.leak.fmt"), { leak: r.leak })}</span>` : "";
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
        <span class="dd-num">${tfmt(t("js.dd.subblock.fmt"), { num, title: block.title.toUpperCase() })}</span>
        <h3>${block.title}</h3>
        <p class="dd-sub">${block.subtitle}</p>
      </div>
      <div class="dd-table-wrap">
        <table class="dd-table">${headHtml}<tbody>${bodyHtml}</tbody></table>
      </div>
      <p class="dd-take">${block.takeaway}</p>
    </div>`;
}

if (document.getElementById("lb-unified")) loadLeaderboards();
if (document.getElementById("dd-stress") || document.getElementById("dd-validity")) loadDeepDive();

// ============================ Language change hook =======================
// When the user toggles EN/中 via the sidebar buttons, i18n.js fires
// `sb:langchange`. We rebuild every dynamic block using the new dictionary,
// re-fetch language-specific JSON, and preserve user state (selected event /
// prediction point / model in the cached widget).
window.addEventListener("sb:langchange", async () => {
  // Leaderboard (table + events tab + stamps)
  if (document.getElementById("lb-unified")) await loadLeaderboards();
  if (document.getElementById("bars-chart")) {
    loadAllLbData();
    if (document.querySelector('[data-lbpane="bars"]')?.classList.contains("active")) setTimeout(renderBars, 50);
  }

  // Deep dive
  if (document.getElementById("dd-stress") || document.getElementById("dd-validity")) loadDeepDive();

  // Reset drawer toggle button labels to the closed (▾) state in the new language
  document.querySelectorAll(".drawer-toggle").forEach(btn => {
    const drawer = document.getElementById(btn.dataset.drawerId);
    btn.textContent = drawer?.classList.contains("open") ? t("js.drawer.hide") : t("js.drawer.show");
  });

  // Reset suggest-topic toggle label
  if (suggestToggle) {
    suggestToggle.textContent = suggestForm?.classList.contains("open") ? t("js.suggest.hide") : t("cb.c3.action");
  }

  // Let the demo page rebuild its own widgets, if it is loaded.
  if (window.SB_DEMO) window.SB_DEMO.onLangChange();
});
