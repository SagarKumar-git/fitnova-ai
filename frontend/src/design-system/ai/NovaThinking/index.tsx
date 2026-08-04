import * as React from "react";
import { motion } from "framer-motion";
import { aiThinkingVariants } from "../../motion";
import { cn } from "../../../utils/cn";

export interface NovaThinkingProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

export const NovaThinking = React.forwardRef<HTMLDivElement, NovaThinkingProps>(
  ({ className, message = "Nova is thinking...", ...props }, ref) => {
    return (
      <motion.div
        ref={ref as any}
        variants={aiThinkingVariants}
        initial="hidden"
        animate="thinking"
        className={cn("flex items-center gap-3 text-muted-foreground", className)}
        {...(props as any)}
      >
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" />
        </div>
        <span className="text-sm font-medium">{message}</span>
      </motion.div>
    );
  }
);
NovaThinking.displayName = "NovaThinking";
