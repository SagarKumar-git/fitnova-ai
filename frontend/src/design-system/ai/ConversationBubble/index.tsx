import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ConversationBubbleProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ConversationBubble = React.forwardRef<HTMLDivElement, ConversationBubbleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ConversationBubble Placeholder"}
      </div>
    );
  }
);
ConversationBubble.displayName = "ConversationBubble";
