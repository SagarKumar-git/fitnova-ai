import * as React from "react";
import { cn } from "../../../utils/cn";

export interface PopoverProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Popover Placeholder"}
      </div>
    );
  }
);
Popover.displayName = "Popover";
