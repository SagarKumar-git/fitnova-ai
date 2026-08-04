import * as React from 'react';
import { motion } from 'framer-motion';
import { Surface, Text, Flex } from '../../../design-system/primitives';
import { Skeleton } from '../../../design-system/feedback';

export interface WidgetContainerProps {
  title?: string;
  isLoading?: boolean;
  priority?: number;
  pin?: boolean;
  favorite?: boolean;
  expand?: boolean;
  refresh?: () => void;
  children: React.ReactNode;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  title, isLoading, pin, children
}) => {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0px 12px 30px rgba(0,0,0,0.1)' }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="h-full flex flex-col"
    >
      <Surface className="p-5 flex flex-col gap-4 h-full relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {title && (
          <Flex justify="between" align="center" className="mb-2">
            <Text variant="headingS" className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">{title}</Text>
            <Flex gap="2">
              {pin && <div className="w-2 h-2 rounded-full bg-primary" />}
            </Flex>
          </Flex>
        )}
        {isLoading ? <Skeleton className="h-full min-h-[120px] w-full rounded-lg" /> : children}
      </Surface>
    </motion.div>
  );
};
