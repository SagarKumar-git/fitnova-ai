import * as React from "react";
import { cn } from "../../../utils/cn";

export interface IconProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Icon = React.forwardRef<HTMLDivElement, IconProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Icon Placeholder"}
      </div>
    );
  }
);
Icon.displayName = "Icon";
