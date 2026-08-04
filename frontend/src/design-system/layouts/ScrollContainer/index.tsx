import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal" | "both";
}

export const ScrollContainer = React.forwardRef<HTMLDivElement, ScrollContainerProps>(
  ({ className, orientation = "vertical", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-1 custom-sidebar-scrollbar",
          orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
          orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
          orientation === "both" && "overflow-auto",
          className
        )}
        {...props}
      />
    );
  }
);
ScrollContainer.displayName = "ScrollContainer";
