import * as React from "react";
import { cn } from "../../../utils/cn";

export interface AutocompleteProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Autocomplete = React.forwardRef<HTMLDivElement, AutocompleteProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Autocomplete Placeholder"}
      </div>
    );
  }
);
Autocomplete.displayName = "Autocomplete";
