import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AuthCardProps {
  children: React.ReactNode;
  hasError?: boolean;
  isNavigatingOut?: boolean;
  className?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  children,
  hasError = false,
  isNavigatingOut = false,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    // Check device and motion preferences
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReducedMotion) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let targetRotate = 0;
    let currentRotate = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;

      // Normalized coordinates relative to card center (-1 to 1)
      const normX = Math.max(-1, Math.min(1, (e.clientX - cardCenterX) / (window.innerWidth / 2)));
      const normY = Math.max(-1, Math.min(1, (e.clientY - cardCenterY) / (window.innerHeight / 2)));

      // Subtle parallax limits: X ±3px, Y ±3px, rotation max ±0.8deg
      targetX = normX * 3;
      targetY = normY * 3;
      targetRotate = normX * 0.7;
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
      targetRotate = 0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    const updateParallax = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      currentRotate += (targetRotate - currentRotate) * 0.08;

      if (card) {
        card.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) rotate3d(0, 0, 1, ${currentRotate.toFixed(2)}deg)`;
      }

      rafRef.current = requestAnimationFrame(updateParallax);
    };

    rafRef.current = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={
        isNavigatingOut
          ? { opacity: 0, y: -8, scale: 0.985 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full max-w-[440px] relative z-10 ${hasError ? 'animate-shake' : ''} ${className}`}
    >
      <div
        ref={cardRef}
        style={{
          background: 'rgba(5, 15, 30, 0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(163, 255, 0, 0.20)',
          borderRadius: '22px',
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(57, 255, 20, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.07)',
          willChange: 'transform',
        }}
        className="p-6 sm:p-8 relative overflow-hidden"
      >
        {/* Subtle top edge neon reflection */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#39FF14]/40 to-transparent pointer-events-none" />
        {children}
      </div>
    </motion.div>
  );
};
