import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

export interface FloatingWidgetProps {
  state?: 'idle' | 'hover' | 'thinking' | 'listening' | 'expanded' | 'celebrating';
  onClick?: () => void;
  className?: string;
}

export const FloatingWidget = React.forwardRef<HTMLDivElement, FloatingWidgetProps>(
  ({ state = 'idle', onClick, className }, ref) => {
    
    const variants = {
      idle: { scale: 1, boxShadow: '0px 4px 20px rgba(0,0,0,0.1)' },
      hover: { scale: 1.05, boxShadow: '0px 8px 30px rgba(0,0,0,0.15)' },
      thinking: { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0], transition: { repeat: Infinity, duration: 2 } },
      listening: { scale: [1, 1.2, 1], boxShadow: '0px 0px 40px rgba(var(--primary), 0.5)', transition: { repeat: Infinity, duration: 1.5 } },
      expanded: { scale: 1, width: 300, height: 400, borderRadius: 24 },
      celebrating: { scale: [1, 1.2, 1], rotate: [0, 360], transition: { duration: 1 } }
    };

    return (
      <motion.div
        ref={ref}
        className={cn('fixed bottom-6 right-6 flex items-center justify-center bg-primary text-primary-foreground cursor-pointer z-50', className, state !== 'expanded' ? 'w-16 h-16 rounded-full' : 'p-4')}
        variants={variants as any}
        initial="idle"
        animate={state}
        whileHover={state === 'idle' ? 'hover' : undefined}
        onClick={onClick}
      >
        {state !== 'expanded' ? (
           <span className="font-bold text-xl">N</span>
        ) : (
           <div className="flex flex-col h-full w-full">Expanded Nova</div>
        )}
      </motion.div>
    );
  }
);
FloatingWidget.displayName = 'FloatingWidget';
