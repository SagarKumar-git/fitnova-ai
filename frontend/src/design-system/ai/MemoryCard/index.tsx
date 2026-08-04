import * as React from "react";
import { cn } from "../../../utils/cn";

export interface MemoryCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const MemoryCard = React.forwardRef<HTMLDivElement, MemoryCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "MemoryCard Placeholder"}
      </div>
    );
  }
);
MemoryCard.displayName = "MemoryCard";
