import * as React from "react";
import { cn } from "../../../utils/cn";

export interface RecoveryCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const RecoveryCard = React.forwardRef<HTMLDivElement, RecoveryCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "RecoveryCard Placeholder"}
      </div>
    );
  }
);
RecoveryCard.displayName = "RecoveryCard";
