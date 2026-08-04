import * as React from "react";
import { cn } from "../../../utils/cn";

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Sidebar Placeholder"}
      </div>
    );
  }
);
Sidebar.displayName = "Sidebar";
