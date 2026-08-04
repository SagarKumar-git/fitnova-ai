import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

export interface HealthRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export const HealthRing: React.FC<HealthRingProps> = ({
  value,
  max,
  size = 120,
  strokeWidth = 12,
  color = 'stroke-primary',
  trackColor = 'stroke-muted',
  className,
  children
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeMax = max <= 0 ? 1 : max;
  const percent = Math.min(Math.max(value / safeMax, 0), 1);
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          className={cn('transition-colors duration-300', trackColor)}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('transition-colors duration-300', color)}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeInOut", type: "tween" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
};
