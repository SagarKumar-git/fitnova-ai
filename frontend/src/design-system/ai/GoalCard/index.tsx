import * as React from "react";
import { cn } from "../../../utils/cn";

export interface GoalCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const GoalCard = React.forwardRef<HTMLDivElement, GoalCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "GoalCard Placeholder"}
      </div>
    );
  }
);
GoalCard.displayName = "GoalCard";
