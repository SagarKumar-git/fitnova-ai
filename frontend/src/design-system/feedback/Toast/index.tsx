import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Toast Placeholder"}
      </div>
    );
  }
);
Toast.displayName = "Toast";
