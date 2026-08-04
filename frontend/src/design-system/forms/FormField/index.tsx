import * as React from "react";
import { cn } from "../../../utils/cn";
import { Label } from "../Label";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, children, label, error, helperText, required, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && (
          <Label className={cn(error && "text-destructive")}>
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </Label>
        )}
        {children}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";
