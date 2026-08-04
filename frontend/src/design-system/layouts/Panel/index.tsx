import * as React from "react";
import { cn } from "../../../utils/cn";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Panel Placeholder"}
      </div>
    );
  }
);
Panel.displayName = "Panel";
