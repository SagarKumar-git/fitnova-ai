import * as React from "react";
import { cn } from "../../../utils/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center p-8 text-center", className)}
        {...props}
      >
        {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
            {description}
          </p>
        )}
        {action && <div>{action}</div>}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";
