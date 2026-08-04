import * as React from "react";
import { cn } from "../../../utils/cn";

export interface hooksProps extends React.HTMLAttributes<HTMLDivElement> {}

export const hooks = React.forwardRef<HTMLDivElement, hooksProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "hooks Placeholder"}
      </div>
    );
  }
);
hooks.displayName = "hooks";
