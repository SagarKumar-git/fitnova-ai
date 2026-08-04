import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ConfirmationDialogProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ConfirmationDialog = React.forwardRef<HTMLDivElement, ConfirmationDialogProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ConfirmationDialog Placeholder"}
      </div>
    );
  }
);
ConfirmationDialog.displayName = "ConfirmationDialog";
