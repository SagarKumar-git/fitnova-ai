import * as React from "react";
import { cn } from "../../../utils/cn";

export interface SidebarLayoutProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SidebarLayout = React.forwardRef<HTMLDivElement, SidebarLayoutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "SidebarLayout Placeholder"}
      </div>
    );
  }
);
SidebarLayout.displayName = "SidebarLayout";
