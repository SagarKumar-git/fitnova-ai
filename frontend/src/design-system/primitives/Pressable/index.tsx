import * as React from "react";
import { cn } from "../../../utils/cn";

export interface PressableProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Pressable = React.forwardRef<HTMLDivElement, PressableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Pressable Placeholder"}
      </div>
    );
  }
);
Pressable.displayName = "Pressable";
