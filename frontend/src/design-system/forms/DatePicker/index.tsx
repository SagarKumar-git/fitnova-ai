import * as React from "react";
import { cn } from "../../../utils/cn";

export interface DatePickerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "DatePicker Placeholder"}
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";
