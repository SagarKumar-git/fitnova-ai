import * as React from "react";
import { cn } from "../../../utils/cn";

export interface HeadingProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Heading = React.forwardRef<HTMLDivElement, HeadingProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Heading Placeholder"}
      </div>
    );
  }
);
Heading.displayName = "Heading";
