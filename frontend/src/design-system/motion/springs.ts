export const springs = {
  // The signature "Nova Spring" for satisfying pop animations (Success, badges)
  nova: {
    type: "spring",
    stiffness: 400,
    damping: 25,
    mass: 1,
  },
  // Used for page transitions, drawers, sidebars
  smooth: {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 1,
  },
  // Gentle, heavy spring for modals and bottom sheets
  gentle: {
    type: "spring",
    stiffness: 120,
    damping: 14,
    mass: 1,
  },
  // Bouncy spring for micro-interactions (e.g., heart icon)
  bouncy: {
    type: "spring",
    stiffness: 500,
    damping: 15,
    mass: 1,
  }
} as const;
