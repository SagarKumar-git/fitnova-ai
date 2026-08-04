import * as React from "react";
import { cn } from "../../../utils/cn";

export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Spacer Placeholder"}
      </div>
    );
  }
);
Spacer.displayName = "Spacer";
