import * as React from "react";
import { cn } from "../../../utils/cn";

export const AppLayout = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex h-screen w-full overflow-hidden bg-background", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AppLayout.displayName = "AppLayout";
