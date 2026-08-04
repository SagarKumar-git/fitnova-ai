import type { Variants } from "framer-motion";
import { durations, easings } from "./transitions";
import { springs } from "./springs";

/**
 * Reusable Framer Motion variants.
 * Pass these to the `variants` prop of motion components.
 */

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.decelerate,
    }
  },
  exit: { 
    opacity: 0, 
    y: -12,
    transition: {
      duration: durations.fast,
      ease: easings.accelerate,
    }
  },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: springs.gentle
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: durations.fast, ease: easings.accelerate }
  },
};

export const cardHoverVariants: Variants = {
  rest: { y: 0, scale: 1, boxShadow: "0px 2px 8px rgba(0,0,0,0.04)" },
  hover: { 
    y: -4, 
    scale: 1.01,
    boxShadow: "0px 12px 24px rgba(0,0,0,0.12)",
    transition: springs.smooth
  },
  tap: {
    y: 0,
    scale: 0.98,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.04)",
    transition: springs.bouncy
  }
};

export const drawerVariants: Variants = {
  hidden: { x: "100%", opacity: 0 },
  visible: { 
    x: "0%", 
    opacity: 1,
    transition: springs.smooth
  },
  exit: { 
    x: "100%", 
    opacity: 0,
    transition: { duration: durations.normal, ease: easings.accelerate }
  }
};

// AI Specific Animations
export const aiThinkingVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  thinking: {
    opacity: [0.4, 1, 0.4],
    scale: [0.95, 1.05, 0.95],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const aiStreamingVariants = {
  hidden: { opacity: 0 },
  visible: (customDelay: number = 0) => ({
    opacity: 1,
    transition: {
      delay: customDelay,
      duration: durations.fast,
    }
  })
};
