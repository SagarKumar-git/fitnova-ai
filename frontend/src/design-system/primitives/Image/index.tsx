import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ImageProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Image = React.forwardRef<HTMLDivElement, ImageProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Image Placeholder"}
      </div>
    );
  }
);
Image.displayName = "Image";
