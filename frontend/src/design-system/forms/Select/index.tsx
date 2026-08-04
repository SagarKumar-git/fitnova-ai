import * as React from "react";
import { cn } from "../../../utils/cn";

export interface SelectProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Select Placeholder"}
      </div>
    );
  }
);
Select.displayName = "Select";
