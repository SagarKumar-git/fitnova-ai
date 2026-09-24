import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  alpha: number;
  color: string;
}

export const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const smoothMouseRef = useRef({ x: -1000, y: -1000 });
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Detect mobile and reduced motion
    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Responsive particle count
    const particleCount = prefersReducedMotion ? 0 : isMobile ? 18 : 42;
    const colors = ['#39FF14', '#A8FF00', '#DFFF00'];

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const baseVx = (Math.random() - 0.5) * 0.45;
      const baseVy = (Math.random() - 0.5) * 0.45;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        radius: Math.random() * 1.5 + 1.2,
        alpha: Math.random() * 0.35 + 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Handle resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Handle mouse & touch movement without React re-renders
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      mouseRef.current.x = clientX;
      mouseRef.current.y = clientY;
      mouseRef.current.active = true;

      if (smoothMouseRef.current.x < 0) {
        smoothMouseRef.current.x = clientX;
        smoothMouseRef.current.y = clientY;
      }
    };

    const handlePointerLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave, { passive: true });

    // Heartbeat ECG wave offset
    let ecgOffset = 0;

    // Render loop
    const render = () => {
      // 1. Fill base dark navy background
      ctx.fillStyle = '#020817';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw subtle background radial energy spots
      const bgGrad1 = ctx.createRadialGradient(width * 0.2, height * 0.25, 0, width * 0.2, height * 0.25, width * 0.45);
      bgGrad1.addColorStop(0, 'rgba(57, 255, 20, 0.04)');
      bgGrad1.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad1;
      ctx.fillRect(0, 0, width, height);

      const bgGrad2 = ctx.createRadialGradient(width * 0.8, height * 0.75, 0, width * 0.8, height * 0.75, width * 0.45);
      bgGrad2.addColorStop(0, 'rgba(168, 255, 0, 0.035)');
      bgGrad2.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad2;
      ctx.fillRect(0, 0, width, height);

      // 3. Fine athletic HUD grid dots
      const gridSpacing = isMobile ? 50 : 38;
      ctx.fillStyle = 'rgba(168, 255, 0, 0.04)';
      for (let gx = 0; gx < width; gx += gridSpacing) {
        for (let gy = 0; gy < height; gy += gridSpacing) {
          ctx.fillRect(gx, gy, 1, 1);
        }
      }

      // If reduced motion is requested, render static state and skip movement
      if (prefersReducedMotion) {
        return;
      }

      // 4. Ambient light following cursor smoothly
      if (mouseRef.current.active) {
        smoothMouseRef.current.x += (mouseRef.current.x - smoothMouseRef.current.x) * 0.08;
        smoothMouseRef.current.y += (mouseRef.current.y - smoothMouseRef.current.y) * 0.08;

        const cursorGlow = ctx.createRadialGradient(
          smoothMouseRef.current.x,
          smoothMouseRef.current.y,
          0,
          smoothMouseRef.current.x,
          smoothMouseRef.current.y,
          isMobile ? 180 : 280
        );
        cursorGlow.addColorStop(0, 'rgba(57, 255, 20, 0.09)');
        cursorGlow.addColorStop(0.4, 'rgba(168, 255, 0, 0.035)');
        cursorGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = cursorGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // 5. Very subtle fitness/heartbeat-inspired ECG wave
      ecgOffset = (ecgOffset + 0.8) % width;
      const waveY = height * 0.82;
      ctx.beginPath();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.12)';

      for (let x = 0; x < width; x += 3) {
        // Calculate localized ECG spike pattern every ~350px
        const cycleX = (x + ecgOffset) % 360;
        let dy = 0;
        if (cycleX > 100 && cycleX < 115) {
          // P wave
          dy = -Math.sin(((cycleX - 100) / 15) * Math.PI) * 4;
        } else if (cycleX >= 115 && cycleX < 125) {
          // Q dip
          dy = Math.sin(((cycleX - 115) / 10) * Math.PI) * 5;
        } else if (cycleX >= 125 && cycleX < 145) {
          // R spike (high peak)
          dy = -Math.sin(((cycleX - 125) / 20) * Math.PI) * 26;
        } else if (cycleX >= 145 && cycleX < 155) {
          // S dip
          dy = Math.sin(((cycleX - 145) / 10) * Math.PI) * 8;
        } else if (cycleX >= 165 && cycleX < 195) {
          // T wave
          dy = -Math.sin(((cycleX - 165) / 30) * Math.PI) * 6;
        }

        const y = waveY + dy;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 6. Floating Particles with subtle cursor reaction
      const mouseX = smoothMouseRef.current.x;
      const mouseY = smoothMouseRef.current.y;
      const interactionDist = 120;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Cursor reaction
        if (mouseRef.current.active) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.hypot(dx, dy);

          if (dist < interactionDist && dist > 0.1) {
            const force = (1 - dist / interactionDist) * 0.45;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Return velocity smoothly toward base velocity
        p.vx += (p.baseVx - p.vx) * 0.03;
        p.vy += (p.baseVy - p.vy) * 0.03;

        // Position update
        p.x += p.vx;
        p.y += p.vy;

        // Boundary wrap
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle with subtle glow
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 select-none"
    />
  );
};
