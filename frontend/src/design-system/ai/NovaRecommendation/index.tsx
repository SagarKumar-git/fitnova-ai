import * as React from "react";
import { cn } from "../../../utils/cn";
import { Surface, Text, Flex } from "../../primitives";
import { Badge } from "../../data-display";

export interface NovaRecommendationProps extends React.HTMLAttributes<HTMLDivElement> {
  type: "workout" | "nutrition" | "recovery" | "goal";
  title: string;
  description: string;
  confidence?: number;
  action?: React.ReactNode;
}

export const NovaRecommendation = React.forwardRef<HTMLDivElement, NovaRecommendationProps>(
  ({ className, type, title, description, confidence, action, ...props }, ref) => {
    return (
      <Surface ref={ref} className={cn("p-5 border-primary/20 bg-primary/5", className)} {...props}>
        <Flex direction="col" gap="3">
          <Flex justify="between" align="center">
            <Badge variant="ai" className="uppercase text-[10px]">{type} Recommendation</Badge>
            {confidence && (
              <Text variant="caption" className="text-primary font-bold">
                {confidence}% Match
              </Text>
            )}
          </Flex>
          
          <div>
            <Text variant="headingS" className="mb-1">{title}</Text>
            <Text variant="bodySmall" className="text-muted-foreground leading-relaxed">
              {description}
            </Text>
          </div>

          {action && <div className="mt-2">{action}</div>}
        </Flex>
      </Surface>
    );
  }
);
NovaRecommendation.displayName = "NovaRecommendation";
