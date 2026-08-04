import * as React from "react";
import { cn } from "../../../utils/cn";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Divider Placeholder"}
      </div>
    );
  }
);
Divider.displayName = "Divider";
