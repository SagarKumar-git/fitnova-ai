import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ResponsiveNavigationProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ResponsiveNavigation = React.forwardRef<HTMLDivElement, ResponsiveNavigationProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ResponsiveNavigation Placeholder"}
      </div>
    );
  }
);
ResponsiveNavigation.displayName = "ResponsiveNavigation";
