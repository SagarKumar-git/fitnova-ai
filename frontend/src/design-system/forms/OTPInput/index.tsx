import * as React from "react";
import { cn } from "../../../utils/cn";

export interface OTPInputProps extends React.HTMLAttributes<HTMLDivElement> {}

export const OTPInput = React.forwardRef<HTMLDivElement, OTPInputProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "OTPInput Placeholder"}
      </div>
    );
  }
);
OTPInput.displayName = "OTPInput";
