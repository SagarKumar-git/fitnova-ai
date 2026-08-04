import * as React from "react";
import { cn } from "../../../utils/cn";
import { Surface, Text, Flex } from "../../primitives";
import { motion } from "framer-motion";
import { cardInteractivePreset } from "../../motion";

export interface NovaInsightProps extends React.HTMLAttributes<HTMLDivElement> {
  insightType: "trend" | "health" | "prediction";
  content: string;
}

export const NovaInsight = React.forwardRef<HTMLDivElement, NovaInsightProps>(
  ({ className, insightType, content, ...props }, ref) => {
    return (
      <motion.div {...cardInteractivePreset} ref={ref as any}>
        <Surface className={cn("p-4 border-l-4 border-l-primary", className)} {...(props as any)}>
          <Flex gap="3" align="start">
            <div className="mt-0.5 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            </div>
            <div>
              <Text variant="caption" className="uppercase tracking-wider font-bold text-primary mb-1 block">
                {insightType} Insight
              </Text>
              <Text variant="bodySmall" className="leading-relaxed font-medium">
                {content}
              </Text>
            </div>
          </Flex>
        </Surface>
      </motion.div>
    );
  }
);
NovaInsight.displayName = "NovaInsight";
