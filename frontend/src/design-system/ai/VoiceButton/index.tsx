import * as React from "react";
import { cn } from "../../../utils/cn";

export interface VoiceButtonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const VoiceButton = React.forwardRef<HTMLDivElement, VoiceButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "VoiceButton Placeholder"}
      </div>
    );
  }
);
VoiceButton.displayName = "VoiceButton";
