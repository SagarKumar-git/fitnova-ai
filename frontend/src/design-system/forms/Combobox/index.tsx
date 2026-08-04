import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ComboboxProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Combobox = React.forwardRef<HTMLDivElement, ComboboxProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Combobox Placeholder"}
      </div>
    );
  }
);
Combobox.displayName = "Combobox";
