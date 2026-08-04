export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  verySlow: 0.8,
} as const;

export const easings = {
  standard: [0.4, 0, 0.2, 1], // Standard curve
  decelerate: [0.0, 0, 0.2, 1], // Entrance
  accelerate: [0.4, 0, 1, 1], // Exit
  linear: [0, 0, 1, 1], // Linear
} as const;

export const motionTokens = {
  opacity: {
    hidden: 0,
    visible: 1,
    disabled: 0.5,
  },
  scale: {
    hidden: 0.95,
    visible: 1,
    active: 0.98,
    hover: 1.02,
  }
} as const;
