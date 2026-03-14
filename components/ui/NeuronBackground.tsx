'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  targetOpacity: number;
  fadeSpeed: number;
  nextFadeAt: number;
  color: [number, number, number];
  layer: number; // 0=deep, 1=mid, 2=front — parallax depth
}

interface NeuronBackgroundProps {
  nodeCount?: number;
  connectionDistance?: number;
  overlayOpacity?: number;
  className?: string;
}

const COLORS_DEEP: [number, number, number][] = [
  [20, 40, 80],     // dark blue
  [30, 20, 60],     // dark purple
  [10, 50, 70],     // dark teal
];

const COLORS_MID: [number, number, number][] = [
  [59, 130, 246],   // blue
  [99, 102, 241],   // indigo
  [139, 92, 246],   // violet
  [14, 165, 233],   // sky
];

const COLORS_FRONT: [number, number, number][] = [
  [6, 182, 212],    // cyan
  [99, 102, 241],   // indigo
  [139, 92, 246],   // violet
  [56, 189, 248],   // sky-400
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function pickFrom(arr: [number, number, number][]): [number, number, number] {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Check if OffscreenCanvas + Worker rendering is supported */
function supportsOffscreenCanvas(): boolean {
  try {
    return typeof OffscreenCanvas !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';
  } catch {
    return false;
  }
}

export function NeuronBackground({
  nodeCount = 80,
  connectionDistance = 200,
  overlayOpacity = 0.85,
  className,
}: NeuronBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const timeRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const offscreenRef = useRef(false);

  const initNodes = useCallback((w: number, h: number) => {
    const nodes: Node[] = [];
    const now = performance.now();

    for (let i = 0; i < nodeCount; i++) {
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
    nodesRef.current = nodes;
  }, [nodeCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Try OffscreenCanvas + Worker path
    if (supportsOffscreenCanvas()) {
      try {
        const offscreen = canvas.transferControlToOffscreen();
        const worker = new Worker('/neuron-worker.js');
        worker.postMessage({
          type: 'init',
          canvas: offscreen,
          nodeCount,
          connectionDistance,
          width: w,
          height: h,
          dpr,
        }, [offscreen]);

        workerRef.current = worker;
        offscreenRef.current = true;

        function onResize() {
          const nw = window.innerWidth;
          const nh = window.innerHeight;
          const ndpr = Math.min(window.devicePixelRatio || 1, 2);
          worker.postMessage({ type: 'resize', width: nw, height: nh, dpr: ndpr });
        }

        window.addEventListener('resize', onResize);

        return () => {
          worker.postMessage({ type: 'stop' });
          worker.terminate();
          window.removeEventListener('resize', onResize);
        };
      } catch {
        // Fallback to main-thread rendering
      }
    }

    // ── Main-thread fallback ──
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    function resize() {
      const rdpr = Math.min(window.devicePixelRatio || 1, 2);
      const rw = window.innerWidth;
      const rh = window.innerHeight;
      canvas!.width = rw * rdpr;
      canvas!.height = rh * rdpr;
      canvas!.style.width = `${rw}px`;
      canvas!.style.height = `${rh}px`;
      ctx!.setTransform(rdpr, 0, 0, rdpr, 0, 0);

      if (sizeRef.current.w === 0) {
        initNodes(rw, rh);
      }
      sizeRef.current = { w: rw, h: rh };
    }

    resize();
    window.addEventListener('resize', resize);

    function drawNebulaLayer(w: number, h: number, time: number) {
      // Slow-breathing nebula clouds
      const cx = w * 0.5 + Math.sin(time * 0.00008) * w * 0.1;
      const cy = h * 0.45 + Math.cos(time * 0.00006) * h * 0.08;
      const r = Math.max(w, h) * 0.4;

      // Primary nebula
      const g1 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
      g1.addColorStop(0, 'rgba(6, 60, 120, 0.08)');
      g1.addColorStop(0.3, 'rgba(20, 40, 100, 0.04)');
      g1.addColorStop(0.6, 'rgba(80, 40, 120, 0.02)');
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx!.fillStyle = g1;
      ctx!.fillRect(0, 0, w, h);

      // Secondary nebula — offset
      const cx2 = w * 0.65 + Math.cos(time * 0.00005) * w * 0.08;
      const cy2 = h * 0.6 + Math.sin(time * 0.00007) * h * 0.06;
      const g2 = ctx!.createRadialGradient(cx2, cy2, 0, cx2, cy2, r * 0.6);
      g2.addColorStop(0, 'rgba(6, 130, 180, 0.05)');
      g2.addColorStop(0.5, 'rgba(30, 60, 140, 0.02)');
      g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx!.fillStyle = g2;
      ctx!.fillRect(0, 0, w, h);

      // Tertiary — purple wisp
      const cx3 = w * 0.3 + Math.sin(time * 0.00004) * w * 0.05;
      const cy3 = h * 0.35 + Math.cos(time * 0.00009) * h * 0.04;
      const g3 = ctx!.createRadialGradient(cx3, cy3, 0, cx3, cy3, r * 0.35);
      g3.addColorStop(0, 'rgba(100, 50, 180, 0.04)');
      g3.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx!.fillStyle = g3;
      ctx!.fillRect(0, 0, w, h);
    }

    function animate(timestamp: number) {


      const { w, h } = sizeRef.current;
      const nodes = nodesRef.current;
      timeRef.current = timestamp;

      ctx!.clearRect(0, 0, w, h);

      // Deep nebula layer — very slow breathing
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

      // Draw by layer: deep first, then mid, then front
      for (let layer = 0; layer < 3; layer++) {
        const layerNodes = nodes.filter(n => n.layer === layer);
        const connAlphaMult = layer === 0 ? 0.06 : layer === 1 ? 0.12 : 0.18;
        const connDist = connectionDistance * (layer === 0 ? 0.6 : layer === 1 ? 0.85 : 1.0);
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
                ctx!.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
                ctx!.lineWidth = layer === 0 ? 0.3 : layer === 1 ? 0.5 : 0.8;
                ctx!.beginPath();
                ctx!.moveTo(layerNodes[i].x, layerNodes[i].y);
                ctx!.lineTo(layerNodes[j].x, layerNodes[j].y);
                ctx!.stroke();
              }
            }
          }
        }

        // Nodes
        for (const n of layerNodes) {
          if (n.opacity < 0.01) continue;
          const [r, g, b] = n.color;

          // Glow — larger for front layer
          const glowSize = n.radius * (layer === 0 ? 4 : layer === 1 ? 6 : 10);
          const grad = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowSize);
          const glowAlpha = n.opacity * (layer === 0 ? 0.15 : layer === 1 ? 0.2 : 0.3);
          grad.addColorStop(0, `rgba(${r},${g},${b},${glowAlpha})`);
          grad.addColorStop(0.4, `rgba(${r},${g},${b},${glowAlpha * 0.3})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx!.fillStyle = grad;
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, glowSize, 0, Math.PI * 2);
          ctx!.fill();

          // Core
          ctx!.fillStyle = `rgba(${r},${g},${b},${n.opacity})`;
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
          ctx!.fill();

          // Bright center for front layer
          if (layer === 2 && n.opacity > 0.3) {
            ctx!.fillStyle = `rgba(255,255,255,${n.opacity * 0.3})`;
            ctx!.beginPath();
            ctx!.arc(n.x, n.y, n.radius * 0.4, 0, Math.PI * 2);
            ctx!.fill();
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [initNodes, connectionDistance]);

  return (
    <div className={className ?? 'fixed inset-0 z-0'} aria-hidden="true">
      {/* Deep space base */}
      <div className="absolute inset-0 bg-[#020810]" />
      {/* Overlay for readability */}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(2,8,16,${overlayOpacity})` }}
      />
      {/* Canvas with neurons */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />
    </div>
  );
}
