import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ResponsiveLayoutProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ResponsiveLayout = React.forwardRef<HTMLDivElement, ResponsiveLayoutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ResponsiveLayout Placeholder"}
      </div>
    );
  }
);
ResponsiveLayout.displayName = "ResponsiveLayout";
