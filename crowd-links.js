// SocietyBench — Crowd Connection Lines
// Draws fading colored lines between people's chest centers.

class CrowdLinks {
  constructor(container) {
    this.container = container;
    this.links = [];

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'crowd-links';
    this.ctx = this.canvas.getContext('2d');
    container.insertBefore(this.canvas, container.firstChild);

    // Color palette (RGB triples). Each new link picks one at random.
    this.colors = [
      [135, 206, 235], // sky blue
      [33, 150, 243],  // bright blue
      [255, 140, 0],   // orange
      [156, 39, 176],  // purple
      [233, 30, 99],   // pink
      [76, 175, 80],   // green
      [255, 215, 0],   // gold
      [0, 188, 212],   // cyan
    ];

    this.NEAR_DX = 400;           // <= 400px: always eligible to connect
    this.FAR_DX = 800;            // 400-800px: eligible with FAR_PROB chance
    this.FAR_PROB = 0.5;          // probability of connecting in the far band
    this.MAX_ALPHA = 1;
    this.LINE_WIDTH = 4;
    this.ENDPOINT_RADIUS = 5;     // solid dot at each line endpoint
    this.ENDPOINT_GLOW = 14;      // soft glow halo around the dot
    this.PERSON_TARGET_MIN = 3;   // each person tries to keep 3-10 active links
    this.PERSON_TARGET_MAX = 10;
    this.SCAN_INTERVAL_MS = 300;  // how often we top up missing links per person

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this._running = false;
    this._rafId = null;
    this.setupRouteSync();
  }

  isOnHomePage() {
    const page = document.body.getAttribute('data-active-page');
    return !page || page === 'overview';
  }

  setupRouteSync() {
    window.addEventListener('sb:page-change', (e) => {
      const page = e.detail && e.detail.page;
      if (page === 'overview') this.start();
      else this.stop();
    });
    if (this.isOnHomePage()) this.start();
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.canvas.style.display = '';
    this._scanTimer = setInterval(() => this.tryAddLinks(), this.SCAN_INTERVAL_MS);
    this._rafId = requestAnimationFrame((t) => this.draw(t));
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._scanTimer) { clearInterval(this._scanTimer); this._scanTimer = null; }
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this.links = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = 'none';
  }

  resize() {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
  }

  getPeople() {
    return this.container.querySelectorAll('.crowd-person');
  }

  // Center point of a person's actual rendered figure, in viewport coords.
  // The container is a tall box and the image uses object-fit:contain with
  // object-position:bottom — so for shorter figures the visible art sits in
  // the bottom slice of the container. We compute the real rendered area
  // from naturalWidth/Height and return its center, not the container's.
  getCenter(person) {
    const rect = person.getBoundingClientRect();
    if (rect.width === 0) return null;

    const img = person.querySelector('img');
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.5 };
    }
    const imgRect = img.getBoundingClientRect();
    const boxW = imgRect.width;
    const boxH = imgRect.height;
    const natRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = boxW / boxH;

    let renderedW, renderedH;
    if (natRatio > boxRatio) {
      renderedW = boxW;
      renderedH = boxW / natRatio;
    } else {
      renderedH = boxH;
      renderedW = boxH * natRatio;
    }
    // object-position: bottom — art is anchored to bottom of imgRect.
    const renderedBottom = imgRect.bottom;
    const renderedTop = renderedBottom - renderedH;
    const renderedLeft = imgRect.left + (boxW - renderedW) / 2;
    return {
      x: renderedLeft + renderedW / 2,
      y: renderedTop + renderedH / 2,
    };
  }

  countActiveLinks(person) {
    let n = 0;
    for (let i = 0; i < this.links.length; i++) {
      const l = this.links[i];
      if (l.dying) continue;
      if (l.a === person || l.b === person) n++;
    }
    return n;
  }

  hasLink(a, b) {
    for (let i = 0; i < this.links.length; i++) {
      const l = this.links[i];
      if ((l.a === a && l.b === b) || (l.a === b && l.b === a)) return true;
    }
    return false;
  }

  tryAddLinks() {
    // Freeze the whole link world while a person is being inspected.
    if (this.container.querySelector('.crowd-person.highlighted')) return;

    const people = this.getPeople();
    if (people.length < 2) return;

    // Cache centers once per scan to avoid O(n^2) layout reads.
    const centers = new Map();
    for (let i = 0; i < people.length; i++) {
      const c = this.getCenter(people[i]);
      if (c) centers.set(people[i], c);
    }

    for (let i = 0; i < people.length; i++) {
      const person = people[i];

      // Assign a personal target once. Each person's "social appetite" varies.
      if (person._targetLinks === undefined) {
        const range = this.PERSON_TARGET_MAX - this.PERSON_TARGET_MIN + 1;
        person._targetLinks = this.PERSON_TARGET_MIN + Math.floor(Math.random() * range);
      }

      const active = this.countActiveLinks(person);
      if (active >= person._targetLinks) continue;

      const aCenter = centers.get(person);
      if (!aCenter) continue;

      // Try a few random partners. Anyone within NEAR_DX is always fair game;
      // anyone in the (NEAR_DX, FAR_DX] band is eligible with FAR_PROB.
      let partner = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidate = people[Math.floor(Math.random() * people.length)];
        if (candidate === person) continue;
        const cCenter = centers.get(candidate);
        if (!cCenter) continue;
        const dx = Math.abs(aCenter.x - cCenter.x);
        if (dx > this.FAR_DX) continue;
        if (dx > this.NEAR_DX && Math.random() >= this.FAR_PROB) continue;
        if (this.hasLink(person, candidate)) continue;
        partner = candidate;
        break;
      }

      if (partner) this.addLink(person, partner);
    }
  }

  addLink(a, b) {
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.links.push({
      a, b,
      color,
      bornAt: performance.now(),
      fadeIn: 500,
      hold: 2000 + Math.random() * 1000, // 2-3s hold
      fadeOut: 800,
      dying: false,
      diedAt: 0,
    });
  }

  draw(now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.lineWidth = this.LINE_WIDTH;

    const containerRect = this.container.getBoundingClientRect();
    const containerLeft = containerRect.left;
    const containerTop = containerRect.top;

    // If any person is being hovered, only show that person's lines.
    const hovered = this.container.querySelector('.crowd-person.highlighted');

    // Freeze lifecycle math while hovered: when entering hover, remember the
    // freeze start; when leaving, shift every link's bornAt/diedAt by the
    // frozen duration so they resume exactly where they paused.
    if (hovered && this._frozenAt === undefined) {
      this._frozenAt = now;
    } else if (!hovered && this._frozenAt !== undefined) {
      const delta = now - this._frozenAt;
      for (let i = 0; i < this.links.length; i++) {
        this.links[i].bornAt += delta;
        if (this.links[i].dying) this.links[i].diedAt += delta;
      }
      this._frozenAt = undefined;
    }
    const effNow = this._frozenAt !== undefined ? this._frozenAt : now;

    // Per-frame center cache so two links sharing a person only do one
    // getBoundingClientRect call.
    const centerCache = new Map();
    const getCachedCenter = (person) => {
      let c = centerCache.get(person);
      if (c === undefined) {
        c = this.getCenter(person);
        centerCache.set(person, c);
      }
      return c;
    };

    const survivors = [];
    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];

      // If either endpoint has been pulled from the DOM (person walked off
      // and was removed by animationend), trigger graceful fadeout.
      if (!link.a.isConnected || !link.b.isConnected) {
        if (!link.dying) {
          link.dying = true;
          link.diedAt = effNow;
        }
      }

      // Lines are invisible until a person is hovered. Only render lines
      // that touch the hovered person.
      const visible = hovered && (link.a === hovered || link.b === hovered);

      // Compute alpha based on lifecycle phase.
      let alpha;
      if (link.dying) {
        const t = (effNow - link.diedAt) / link.fadeOut;
        if (t >= 1) continue; // drop
        alpha = (1 - t) * this.MAX_ALPHA;
      } else {
        const age = effNow - link.bornAt;
        if (age < link.fadeIn) {
          alpha = (age / link.fadeIn) * this.MAX_ALPHA;
        } else if (age < link.fadeIn + link.hold) {
          alpha = this.MAX_ALPHA;
        } else if (age < link.fadeIn + link.hold + link.fadeOut) {
          const t = (age - link.fadeIn - link.hold) / link.fadeOut;
          alpha = (1 - t) * this.MAX_ALPHA;
        } else {
          continue; // drop
        }
      }

      const aC = getCachedCenter(link.a);
      const bC = getCachedCenter(link.b);
      if (!aC || !bC) {
        // Element gone but flag wasn't set yet; will be on next frame.
        survivors.push(link);
        continue;
      }

      const ax = aC.x - containerLeft;
      const ay = aC.y - containerTop;
      const bx = bC.x - containerLeft;
      const by = bC.y - containerTop;

      const c = link.color;
      if (visible) {
        // Soft glow halo at each endpoint (drawn first, behind dot + line).
        const glowGrad = (cx, cy) => {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.ENDPOINT_GLOW);
          g.addColorStop(0, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha * 0.9})`);
          g.addColorStop(1, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0)`);
          return g;
        };
        ctx.fillStyle = glowGrad(ax, ay);
        ctx.beginPath();
        ctx.arc(ax, ay, this.ENDPOINT_GLOW, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = glowGrad(bx, by);
        ctx.beginPath();
        ctx.arc(bx, by, this.ENDPOINT_GLOW, 0, Math.PI * 2);
        ctx.fill();

        // Connecting line.
        ctx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Solid endpoint dot on top.
        ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(ax, ay, this.ENDPOINT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, this.ENDPOINT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      survivors.push(link);
    }
    this.links = survivors;

    if (this._running) {
      this._rafId = requestAnimationFrame((t) => this.draw(t));
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('crowd-container');
  if (container) new CrowdLinks(container);
});
