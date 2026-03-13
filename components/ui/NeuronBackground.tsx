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
  color: [number, number, number]; // RGB
}

interface NeuronBackgroundProps {
  /** Number of neuron nodes (default: 60) */
  nodeCount?: number;
  /** Max distance for connections in px (default: 180) */
  connectionDistance?: number;
  /** Background opacity layer (default: 0.97) */
  overlayOpacity?: number;
  /** CSS class for positioning (default: fixed fullscreen) */
  className?: string;
}

const COLORS: [number, number, number][] = [
  [99, 102, 241],   // indigo
  [59, 130, 246],   // blue
  [139, 92, 246],   // violet
  [14, 165, 233],   // sky
  [99, 102, 241],   // indigo (weighted)
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function pickColor(): [number, number, number] {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function NeuronBackground({
  nodeCount = 60,
  connectionDistance = 180,
  overlayOpacity = 0.97,
  className,
}: NeuronBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  const initNodes = useCallback((w: number, h: number) => {
    const nodes: Node[] = [];
    const now = performance.now();
    for (let i = 0; i < nodeCount; i++) {
      const speed = randomBetween(0.08, 0.3);
      const angle = Math.random() * Math.PI * 2;
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: randomBetween(1.5, 3.5),
        opacity: randomBetween(0, 0.5),
        targetOpacity: randomBetween(0.2, 0.8),
        fadeSpeed: randomBetween(0.002, 0.008),
        nextFadeAt: now + randomBetween(2000, 8000),
        color: pickColor(),
      });
    }
    nodesRef.current = nodes;
  }, [nodeCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (sizeRef.current.w === 0) {
        initNodes(w, h);
      }
      sizeRef.current = { w, h };
    }

    resize();
    window.addEventListener('resize', resize);

    function animate() {
      const { w, h } = sizeRef.current;
      const nodes = nodesRef.current;
      const now = performance.now();

      ctx!.clearRect(0, 0, w, h);

      // Update nodes
      for (const n of nodes) {
        // Move
        n.x += n.vx;
        n.y += n.vy;

        // Wrap around edges with padding
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;

        // Pulse: fade toward target, then pick new target
        if (now > n.nextFadeAt) {
          n.targetOpacity = randomBetween(0.1, 0.8);
          n.nextFadeAt = now + randomBetween(3000, 10000);
          n.fadeSpeed = randomBetween(0.002, 0.008);
        }

        if (n.opacity < n.targetOpacity) {
          n.opacity = Math.min(n.opacity + n.fadeSpeed, n.targetOpacity);
        } else {
          n.opacity = Math.max(n.opacity - n.fadeSpeed, n.targetOpacity);
        }
      }

      // Draw connections
      const connDist2 = connectionDistance * connectionDistance;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < connDist2) {
            const dist = Math.sqrt(dist2);
            const alpha = (1 - dist / connectionDistance) * 0.15 * Math.min(nodes[i].opacity, nodes[j].opacity);
            if (alpha > 0.003) {
              const [r, g, b] = nodes[i].color;
              ctx!.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
              ctx!.lineWidth = 0.6;
              ctx!.beginPath();
              ctx!.moveTo(nodes[i].x, nodes[i].y);
              ctx!.lineTo(nodes[j].x, nodes[j].y);
              ctx!.stroke();
            }
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        if (n.opacity < 0.01) continue;
        const [r, g, b] = n.color;

        // Outer glow
        const grad = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 6);
        grad.addColorStop(0, `rgba(${r},${g},${b},${n.opacity * 0.3})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.radius * 6, 0, Math.PI * 2);
        ctx!.fill();

        // Core dot
        ctx!.fillStyle = `rgba(${r},${g},${b},${n.opacity})`;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx!.fill();
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
    <div className={className ?? 'fixed inset-0 -z-10'} aria-hidden="true">
      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(3,7,18,${overlayOpacity})` }}
      />
      {/* Canvas with neurons */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
}
