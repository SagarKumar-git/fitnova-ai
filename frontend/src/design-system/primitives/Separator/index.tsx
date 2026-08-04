import * as React from "react";
import { cn } from "../../../utils/cn";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Separator Placeholder"}
      </div>
    );
  }
);
Separator.displayName = "Separator";
