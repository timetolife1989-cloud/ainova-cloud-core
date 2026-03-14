// Ainova Cloud Intelligence — Neuron Background Web Worker (OffscreenCanvas)
// Runs the particle/nebula animation off the main thread

/** @type {OffscreenCanvas} */
let canvas;
/** @type {OffscreenCanvasRenderingContext2D} */
let ctx;
/** @type {Array} */
let nodes = [];
let config = { nodeCount: 80, connectionDistance: 200 };
let size = { w: 0, h: 0 };
let rafId = 0;

const COLORS_DEEP = [[20,40,80],[30,20,60],[10,50,70]];
const COLORS_MID = [[59,130,246],[99,102,241],[139,92,246],[14,165,233]];
const COLORS_FRONT = [[6,182,212],[99,102,241],[139,92,246],[56,189,248]];

function randomBetween(a, b) { return a + Math.random() * (b - a); }
function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function initNodes(w, h) {
  nodes = [];
  const now = performance.now();
  for (let i = 0; i < config.nodeCount; i++) {
    const layerRoll = Math.random();
    const layer = layerRoll < 0.3 ? 0 : layerRoll < 0.7 ? 1 : 2;
    const speedMult = layer === 0 ? 0.3 : layer === 1 ? 0.6 : 1.0;
    const speed = randomBetween(0.04, 0.18) * speedMult;
    const angle = Math.random() * Math.PI * 2;
    const colors = layer === 0 ? COLORS_DEEP : layer === 1 ? COLORS_MID : COLORS_FRONT;
    const radiusMult = layer === 0 ? 0.6 : layer === 1 ? 1.0 : 1.3;

    nodes.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: randomBetween(1.0, 3.0) * radiusMult,
      opacity: randomBetween(0, 0.3),
      targetOpacity: randomBetween(0.1, layer === 2 ? 0.7 : 0.4),
      fadeSpeed: randomBetween(0.001, 0.004),
      nextFadeAt: now + randomBetween(3000, 12000),
      color: pickFrom(colors),
      layer,
    });
  }
}

function drawNebulaLayer(w, h, time) {
  const cx = w * 0.5 + Math.sin(time * 0.00008) * w * 0.1;
  const cy = h * 0.45 + Math.cos(time * 0.00006) * h * 0.08;
  const r = Math.max(w, h) * 0.4;

  const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g1.addColorStop(0, 'rgba(6,60,120,0.08)');
  g1.addColorStop(0.3, 'rgba(20,40,100,0.04)');
  g1.addColorStop(0.6, 'rgba(80,40,120,0.02)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  const cx2 = w * 0.65 + Math.cos(time * 0.00005) * w * 0.08;
  const cy2 = h * 0.6 + Math.sin(time * 0.00007) * h * 0.06;
  const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r * 0.6);
  g2.addColorStop(0, 'rgba(6,130,180,0.05)');
  g2.addColorStop(0.5, 'rgba(30,60,140,0.02)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);

  const cx3 = w * 0.3 + Math.sin(time * 0.00004) * w * 0.05;
  const cy3 = h * 0.35 + Math.cos(time * 0.00009) * h * 0.04;
  const g3 = ctx.createRadialGradient(cx3, cy3, 0, cx3, cy3, r * 0.35);
  g3.addColorStop(0, 'rgba(100,50,180,0.04)');
  g3.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g3;
  ctx.fillRect(0, 0, w, h);
}

function animate(timestamp) {
  const { w, h } = size;
  ctx.clearRect(0, 0, w, h);

  drawNebulaLayer(w, h, timestamp);

  // Update nodes
  for (const n of nodes) {
    n.x += n.vx;
    n.y += n.vy;
    if (n.x < -30) n.x = w + 30;
    if (n.x > w + 30) n.x = -30;
    if (n.y < -30) n.y = h + 30;
    if (n.y > h + 30) n.y = -30;

    if (timestamp > n.nextFadeAt) {
      n.targetOpacity = randomBetween(0.05, n.layer === 2 ? 0.7 : n.layer === 1 ? 0.4 : 0.2);
      n.nextFadeAt = timestamp + randomBetween(4000, 15000);
      n.fadeSpeed = randomBetween(0.001, 0.004);
    }

    if (n.opacity < n.targetOpacity) {
      n.opacity = Math.min(n.opacity + n.fadeSpeed, n.targetOpacity);
    } else {
      n.opacity = Math.max(n.opacity - n.fadeSpeed, n.targetOpacity);
    }
  }

  // Draw by layer
  for (let layer = 0; layer < 3; layer++) {
    const layerNodes = nodes.filter(n => n.layer === layer);
    const connAlphaMult = layer === 0 ? 0.06 : layer === 1 ? 0.12 : 0.18;
    const connDist = config.connectionDistance * (layer === 0 ? 0.6 : layer === 1 ? 0.85 : 1.0);
    const connDist2 = connDist * connDist;

    // Connections
    for (let i = 0; i < layerNodes.length; i++) {
      for (let j = i + 1; j < layerNodes.length; j++) {
        const dx = layerNodes[i].x - layerNodes[j].x;
        const dy = layerNodes[i].y - layerNodes[j].y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < connDist2) {
          const dist = Math.sqrt(dist2);
          const alpha = (1 - dist / connDist) * connAlphaMult * Math.min(layerNodes[i].opacity, layerNodes[j].opacity);
          if (alpha > 0.002) {
            const [r, g, b] = layerNodes[i].color;
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = layer === 0 ? 0.3 : layer === 1 ? 0.5 : 0.8;
            ctx.beginPath();
            ctx.moveTo(layerNodes[i].x, layerNodes[i].y);
            ctx.lineTo(layerNodes[j].x, layerNodes[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // Nodes
    for (const n of layerNodes) {
      if (n.opacity < 0.01) continue;
      const [r, g, b] = n.color;

      const glowSize = n.radius * (layer === 0 ? 4 : layer === 1 ? 6 : 10);
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowSize);
      const glowAlpha = n.opacity * (layer === 0 ? 0.15 : layer === 1 ? 0.2 : 0.3);
      grad.addColorStop(0, `rgba(${r},${g},${b},${glowAlpha})`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},${glowAlpha * 0.3})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${r},${g},${b},${n.opacity})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();

      if (layer === 2 && n.opacity > 0.3) {
        ctx.fillStyle = `rgba(255,255,255,${n.opacity * 0.3})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  rafId = requestAnimationFrame(animate);
}

self.onmessage = function (e) {
  const msg = e.data;

  if (msg.type === 'init') {
    canvas = msg.canvas;
    ctx = canvas.getContext('2d', { alpha: true });
    config.nodeCount = msg.nodeCount || 80;
    config.connectionDistance = msg.connectionDistance || 200;
    size = { w: msg.width, h: msg.height };
    const dpr = msg.dpr || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initNodes(size.w, size.h);
    rafId = requestAnimationFrame(animate);
  }

  if (msg.type === 'resize') {
    size = { w: msg.width, h: msg.height };
    const dpr = msg.dpr || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  if (msg.type === 'stop') {
    cancelAnimationFrame(rafId);
  }
};
