import * as React from "react";
import { cn } from "../../../utils/cn";

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Timeline Placeholder"}
      </div>
    );
  }
);
Timeline.displayName = "Timeline";
