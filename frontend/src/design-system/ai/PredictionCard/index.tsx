import * as React from "react";
import { cn } from "../../../utils/cn";

export interface PredictionCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PredictionCard = React.forwardRef<HTMLDivElement, PredictionCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "PredictionCard Placeholder"}
      </div>
    );
  }
);
PredictionCard.displayName = "PredictionCard";
