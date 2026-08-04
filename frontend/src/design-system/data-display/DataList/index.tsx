import * as React from "react";
import { cn } from "../../../utils/cn";

export interface DataListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DataList = React.forwardRef<HTMLDivElement, DataListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "DataList Placeholder"}
      </div>
    );
  }
);
DataList.displayName = "DataList";
