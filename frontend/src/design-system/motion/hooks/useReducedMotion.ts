import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/**
 * Hook to determine if the user has requested reduced motion at the OS level.
 * Centralized here to allow overriding or injecting mock values during testing.
 */
export function useReducedMotion() {
  const shouldReduceMotion = useFramerReducedMotion();
  return shouldReduceMotion ?? false;
}
