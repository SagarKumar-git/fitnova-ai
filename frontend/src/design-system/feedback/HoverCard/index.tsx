import * as React from "react";
import { cn } from "../../../utils/cn";

export interface HoverCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const HoverCard = React.forwardRef<HTMLDivElement, HoverCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "HoverCard Placeholder"}
      </div>
    );
  }
);
HoverCard.displayName = "HoverCard";
