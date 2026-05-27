// SocietyBench — Timeline Network Animation
// Floating nodes connected by lines, interactive with mouse

class NetworkAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nodes = [];
    this.mouse = { x: null, y: null };
    this.config = {
      nodeCount: 100,             // number of nodes (increased)
      nodeSizes: [4, 6, 10, 15, 20, 30],  // multiple sizes
      nodeSpeeds: [0.3, 0.4, 0.5, 0.6, 0.7], // multiple speeds
      connectionDistance: 180,    // max distance to draw lines (longer)
      mouseRadius: 150,           // mouse interaction radius (larger)
      colors: {
        nodes: [
          '#2196F3',  // blue
          '#FF9800',  // orange
          '#9C27B0',  // purple
          '#4CAF50'   // green
        ],
        line: 'rgba(33, 150, 243, 0.3)',      // lines more visible
        lineActive: 'rgba(33, 150, 243, 0.7)', // active lines brighter
        highlight: '#FFD700'      // gold highlight
      }
    };

    this.init();
    this.setupEventListeners();
    this.animate();
  }

  init() {
    this.resize();
    this.createNodes();
  }

  resize() {
    // Get the actual display size
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    // Set canvas drawing size to match display size
    this.canvas.width = displayWidth;
    this.canvas.height = displayHeight;

    // Also update on scroll to cover full page
    const updateHeight = () => {
      const fullHeight = Math.max(
        document.documentElement.scrollHeight,
        window.innerHeight
      );
      if (Math.abs(this.canvas.height - fullHeight) > 100) {
        this.canvas.height = fullHeight;
      }
    };
    updateHeight();
  }

  createNodes() {
    this.nodes = [];
    const { nodeCount, nodeSizes, nodeSpeeds, colors } = this.config;

    for (let i = 0; i < nodeCount; i++) {
      // Random size from the sizes array
      const radius = nodeSizes[Math.floor(Math.random() * nodeSizes.length)];

      // Random speed from the speeds array
      const speed = nodeSpeeds[Math.floor(Math.random() * nodeSpeeds.length)];

      // Random color from the colors array
      const color = colors.nodes[Math.floor(Math.random() * colors.nodes.length)];

      this.nodes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        radius: radius,
        color: color
      });
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.resize();
      // Recreate nodes with new canvas size
      this.createNodes();
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY + window.scrollY;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  updateNodes() {
    const mx = this.mouse.x, my = this.mouse.y;
    const hasMouse = mx !== null && my !== null;
    const r = this.config.mouseRadius;
    const r2 = r * r;
    const w = this.canvas.width, h = this.canvas.height;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0 || node.x > w) {
        node.vx *= -1;
        if (node.x < 0) node.x = 0; else if (node.x > w) node.x = w;
      }
      if (node.y < 0 || node.y > h) {
        node.vy *= -1;
        if (node.y < 0) node.y = 0; else if (node.y > h) node.y = h;
      }

      // Cache mouse distance once per frame for reuse in drawConnections/drawNodes.
      if (hasMouse) {
        const dx = node.x - mx, dy = node.y - my;
        const d2 = dx * dx + dy * dy;
        node._d2 = d2;
        node._near = d2 < r2;
        if (node._near) {
          const distance = Math.sqrt(d2);
          const force = (r - distance) / r;
          node.x += (dx / distance) * force * 2;
          node.y += (dy / distance) * force * 2;
        }
      } else {
        node._d2 = Infinity;
        node._near = false;
      }
    }
  }

  drawConnections() {
    const { connectionDistance } = this.config;
    const cd2 = connectionDistance * connectionDistance;
    const ctx = this.ctx;
    const nodes = this.nodes;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= cd2) continue;

        const distance = Math.sqrt(d2);
        const opacity = 1 - distance / connectionDistance;
        const isActive = a._near || b._near;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (isActive) {
          ctx.strokeStyle = `rgba(33, 150, 243, ${opacity * 0.6})`;
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = `rgba(33, 150, 243, ${opacity * 0.15})`;
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      }
    }
  }

  drawNodes() {
    const { colors, mouseRadius } = this.config;
    const ctx = this.ctx;
    const nodes = this.nodes;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isNearMouse = node._near;

      if (isNearMouse) {
        const distanceToMouse = Math.sqrt(node._d2);
        const glowSize = node.radius + 8 * (1 - distanceToMouse / mouseRadius);
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = colors.highlight + '40';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isNearMouse ? colors.highlight : node.color;
      ctx.fill();

      if (!isNearMouse) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = node.color + '30';
        ctx.fill();
      }
    }
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw connections first (behind nodes)
    this.drawConnections();

    // Draw nodes on top
    this.drawNodes();
  }

  animate() {
    this.updateNodes();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('network-canvas');
  if (canvas) new NetworkAnimation(canvas);
});
