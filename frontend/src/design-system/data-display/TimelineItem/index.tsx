import * as React from "react";
import { cn } from "../../../utils/cn";

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "TimelineItem Placeholder"}
      </div>
    );
  }
);
TimelineItem.displayName = "TimelineItem";
