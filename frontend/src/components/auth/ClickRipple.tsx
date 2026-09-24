import React, { useEffect, useState, useCallback, useRef } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const ClickRipple: React.FC = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const handleClick = useCallback((e: MouseEvent | TouchEvent) => {
    // Check if prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const id = ++nextId.current;

    setRipples((prev) => {
      // Limit to max 5 simultaneous ripples for performance
      const trimmed = prev.length >= 5 ? prev.slice(prev.length - 4) : prev;
      return [...trimmed, { id, x: clientX, y: clientY }];
    });

    // Remove ripple after 700ms
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 700);
  }, []);

  useEffect(() => {
    window.addEventListener('click', handleClick, { passive: true });
    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, [handleClick]);

  if (ripples.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="click-ripple-circle"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: '60px',
            height: '60px',
          }}
        />
      ))}
    </div>
  );
};
