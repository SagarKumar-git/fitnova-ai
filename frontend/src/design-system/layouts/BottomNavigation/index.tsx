import * as React from "react";
import { cn } from "../../../utils/cn";

export interface BottomNavigationProps extends React.HTMLAttributes<HTMLDivElement> {}

export const BottomNavigation = React.forwardRef<HTMLDivElement, BottomNavigationProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "BottomNavigation Placeholder"}
      </div>
    );
  }
);
BottomNavigation.displayName = "BottomNavigation";
