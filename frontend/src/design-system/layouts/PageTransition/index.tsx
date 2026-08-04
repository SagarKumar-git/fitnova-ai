import * as React from "react";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { pageVariants } from "../../motion";
import { cn } from "../../../utils/cn";

export interface PageTransitionProps extends HTMLMotionProps<"main"> {}

export const PageTransition = React.forwardRef<HTMLElement, PageTransitionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.main
        ref={ref as any}
        variants={pageVariants}
        initial="hidden"
        animate="enter"
        exit="exit"
        className={cn("w-full h-full flex flex-col", className)}
        {...props}
      >
        {children}
      </motion.main>
    );
  }
);
PageTransition.displayName = "PageTransition";
