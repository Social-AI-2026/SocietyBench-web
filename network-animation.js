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
    console.log('🚀 Initializing network animation');
    this.resize();
    this.createNodes();
    console.log(`✨ Created ${this.nodes.length} nodes`);
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
    this.nodes.forEach(node => {
      // Update position
      node.x += node.vx;
      node.y += node.vy;

      // Bounce off edges
      if (node.x < 0 || node.x > this.canvas.width) {
        node.vx *= -1;
        node.x = Math.max(0, Math.min(this.canvas.width, node.x));
      }
      if (node.y < 0 || node.y > this.canvas.height) {
        node.vy *= -1;
        node.y = Math.max(0, Math.min(this.canvas.height, node.y));
      }

      // Mouse interaction - nodes move away from cursor
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = node.x - this.mouse.x;
        const dy = node.y - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.config.mouseRadius) {
          const force = (this.config.mouseRadius - distance) / this.config.mouseRadius;
          node.x += (dx / distance) * force * 2;
          node.y += (dy / distance) * force * 2;
        }
      }
    });
  }

  drawConnections() {
    const { connectionDistance, colors } = this.config;

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeA = this.nodes[i];
        const nodeB = this.nodes[j];

        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionDistance) {
          const opacity = 1 - (distance / connectionDistance);

          // Check if either node is near mouse
          let isActive = false;
          if (this.mouse.x !== null && this.mouse.y !== null) {
            const distA = Math.sqrt(
              Math.pow(nodeA.x - this.mouse.x, 2) +
              Math.pow(nodeA.y - this.mouse.y, 2)
            );
            const distB = Math.sqrt(
              Math.pow(nodeB.x - this.mouse.x, 2) +
              Math.pow(nodeB.y - this.mouse.y, 2)
            );
            isActive = distA < this.config.mouseRadius || distB < this.config.mouseRadius;
          }

          this.ctx.beginPath();
          this.ctx.moveTo(nodeA.x, nodeA.y);
          this.ctx.lineTo(nodeB.x, nodeB.y);
          this.ctx.strokeStyle = isActive
            ? colors.lineActive.replace('0.4', `${opacity * 0.6}`)
            : colors.line.replace('0.15', `${opacity * 0.15}`);
          this.ctx.lineWidth = isActive ? 1.5 : 1;
          this.ctx.stroke();
        }
      }
    }
  }

  drawNodes() {
    const { colors, mouseRadius } = this.config;

    this.nodes.forEach(node => {
      let isNearMouse = false;
      let distanceToMouse = Infinity;

      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = node.x - this.mouse.x;
        const dy = node.y - this.mouse.y;
        distanceToMouse = Math.sqrt(dx * dx + dy * dy);
        isNearMouse = distanceToMouse < mouseRadius;
      }

      // Draw glow for nodes near mouse
      if (isNearMouse) {
        const glowSize = node.radius + 8 * (1 - distanceToMouse / mouseRadius);
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
        this.ctx.fillStyle = colors.highlight + '40'; // 25% opacity
        this.ctx.fill();
      }

      // Draw main node with its own color
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = isNearMouse ? colors.highlight : node.color;
      this.ctx.fill();

      // Draw subtle glow using node's own color
      if (!isNearMouse) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius + 2, 0, Math.PI * 2);
        this.ctx.fillStyle = node.color + '30'; // 20% opacity
        this.ctx.fill();
      }
    });
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
  console.log('🎨 Network animation script loaded');
  const canvas = document.getElementById('network-canvas');
  console.log('📍 Canvas element:', canvas);
  if (canvas) {
    console.log('✅ Starting network animation...');
    new NetworkAnimation(canvas);
  } else {
    console.error('❌ Canvas element not found!');
  }
});
