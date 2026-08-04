import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ValidationMessageProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ValidationMessage = React.forwardRef<HTMLDivElement, ValidationMessageProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ValidationMessage Placeholder"}
      </div>
    );
  }
);
ValidationMessage.displayName = "ValidationMessage";
