import type { HTMLMotionProps } from "framer-motion";
import { pageVariants, modalVariants, cardHoverVariants } from "./variants";

/**
 * Pre-configured motion props to spread onto motion elements.
 * Example: <motion.div {...pageTransitionPreset}>
 */

export const pageTransitionPreset: HTMLMotionProps<"div"> = {
  variants: pageVariants,
  initial: "hidden",
  animate: "enter",
  exit: "exit",
};

export const modalPreset: HTMLMotionProps<"div"> = {
  variants: modalVariants,
  initial: "hidden",
  animate: "visible",
  exit: "exit",
};

export const cardInteractivePreset: HTMLMotionProps<"div"> = {
  variants: cardHoverVariants,
  initial: "rest",
  whileHover: "hover",
  whileTap: "tap",
};
