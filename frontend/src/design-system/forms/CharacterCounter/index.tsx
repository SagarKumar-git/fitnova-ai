import * as React from "react";
import { cn } from "../../../utils/cn";

export interface CharacterCounterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CharacterCounter = React.forwardRef<HTMLDivElement, CharacterCounterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "CharacterCounter Placeholder"}
      </div>
    );
  }
);
CharacterCounter.displayName = "CharacterCounter";
