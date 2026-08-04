import * as React from "react";
import { cn } from "../../../utils/cn";

export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Drawer Placeholder"}
      </div>
    );
  }
);
Drawer.displayName = "Drawer";
