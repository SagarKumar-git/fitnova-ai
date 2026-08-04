import * as React from "react";
import { cn } from "../../../utils/cn";

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-2",
      md: "h-8 w-8 border-3",
      lg: "h-12 w-12 border-4",
      xl: "h-16 w-16 border-4",
    };

    return (
      <div
        ref={ref}
        role="status"
        className={cn(
          "inline-block animate-spin rounded-full border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
          Loading...
        </span>
      </div>
    );
  }
);
LoadingSpinner.displayName = "LoadingSpinner";
