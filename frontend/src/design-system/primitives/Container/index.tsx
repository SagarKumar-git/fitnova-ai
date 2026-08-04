import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Container Placeholder"}
      </div>
    );
  }
);
Container.displayName = "Container";
