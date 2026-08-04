import * as React from "react";
import { cn } from "../../../utils/cn";

export interface WorkoutCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const WorkoutCard = React.forwardRef<HTMLDivElement, WorkoutCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "WorkoutCard Placeholder"}
      </div>
    );
  }
);
WorkoutCard.displayName = "WorkoutCard";
