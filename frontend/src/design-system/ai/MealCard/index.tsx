import * as React from "react";
import { cn } from "../../../utils/cn";

export interface MealCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const MealCard = React.forwardRef<HTMLDivElement, MealCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "MealCard Placeholder"}
      </div>
    );
  }
);
MealCard.displayName = "MealCard";
