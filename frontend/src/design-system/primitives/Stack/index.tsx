import * as React from "react";
import { cn } from "../../../utils/cn";

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Stack Placeholder"}
      </div>
    );
  }
);
Stack.displayName = "Stack";
