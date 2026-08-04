import * as React from "react";
import { cn } from "../../../utils/cn";

export interface NovaStreamingProps extends React.HTMLAttributes<HTMLDivElement> {}

export const NovaStreaming = React.forwardRef<HTMLDivElement, NovaStreamingProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "NovaStreaming Placeholder"}
      </div>
    );
  }
);
NovaStreaming.displayName = "NovaStreaming";
