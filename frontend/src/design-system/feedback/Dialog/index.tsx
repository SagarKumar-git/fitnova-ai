import * as React from "react";
import { cn } from "../../../utils/cn";

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Dialog Placeholder"}
      </div>
    );
  }
);
Dialog.displayName = "Dialog";
