import React, { useEffect, useRef } from 'react';

export const CursorGlow: React.FC = () => {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef({ x: -200, y: -200, targetX: -200, targetY: -200, visible: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Only enable on fine pointer (mouse), not touch or mobile
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasPointer || prefersReducedMotion) return;

    const handlePointerMove = (e: MouseEvent) => {
      posRef.current.targetX = e.clientX;
      posRef.current.targetY = e.clientY;
      posRef.current.visible = true;

      // Initialize immediate position if first move
      if (posRef.current.x < 0) {
        posRef.current.x = e.clientX;
        posRef.current.y = e.clientY;
      }
    };

    const handlePointerLeave = () => {
      posRef.current.visible = false;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave, { passive: true });

    const animate = () => {
      const { targetX, targetY, visible } = posRef.current;

      // Smooth lerp trailing glow
      posRef.current.x += (targetX - posRef.current.x) * 0.15;
      posRef.current.y += (targetY - posRef.current.y) * 0.15;

      const currentX = posRef.current.x;
      const currentY = posRef.current.y;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
        dotRef.current.style.opacity = visible ? '0.75' : '0';
      }

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentX - 120}px, ${currentY - 120}px, 0)`;
        glowRef.current.style.opacity = visible ? '0.35' : '0';
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
      {/* Soft trailing radial glow */}
      <div
        ref={glowRef}
        className="absolute top-0 left-0 w-60 h-60 rounded-full blur-2xl transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle, rgba(57, 255, 20, 0.12) 0%, rgba(168, 255, 0, 0.05) 50%, transparent 70%)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Small precision cursor follower dot */}
      <div
        ref={dotRef}
        className="absolute top-0 left-0 -ml-1 -mt-1 w-2 h-2 rounded-full bg-neonGreen shadow-[0_0_8px_#39FF14] transition-opacity duration-200"
        style={{
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
};
