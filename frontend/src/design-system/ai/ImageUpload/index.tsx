import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ImageUploadProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ImageUpload = React.forwardRef<HTMLDivElement, ImageUploadProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ImageUpload Placeholder"}
      </div>
    );
  }
);
ImageUpload.displayName = "ImageUpload";
