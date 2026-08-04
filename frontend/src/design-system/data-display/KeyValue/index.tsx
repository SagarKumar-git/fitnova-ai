import * as React from "react";
import { cn } from "../../../utils/cn";

export interface KeyValueProps extends React.HTMLAttributes<HTMLDivElement> {}

export const KeyValue = React.forwardRef<HTMLDivElement, KeyValueProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "KeyValue Placeholder"}
      </div>
    );
  }
);
KeyValue.displayName = "KeyValue";
