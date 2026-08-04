import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ResponsiveTable Placeholder"}
      </div>
    );
  }
);
ResponsiveTable.displayName = "ResponsiveTable";
