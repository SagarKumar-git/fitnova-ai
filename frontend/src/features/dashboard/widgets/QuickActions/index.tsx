import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { Text, Flex } from '../../../../design-system/primitives';
import { motion } from 'framer-motion';

const actions = [
  { label: 'Start Workout', icon: '🏃' },
  { label: 'Scan Food', icon: '📸' },
  { label: 'Log Water', icon: '💧' },
  { label: 'Ask Nova', icon: '✨' }
];

export const QuickActionsWidget: React.FC<WidgetProps> = ({ isLoading }) => {
  return (
    <WidgetContainer isLoading={isLoading}>
      <Flex gap="3" className="overflow-x-auto pb-2 scrollbar-hide" align="center">
        {actions.map((act, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center min-w-[90px] h-[90px] rounded-2xl bg-muted/40 border border-border/50 cursor-pointer"
          >
            <span className="text-2xl mb-1">{act.icon}</span>
            <Text variant="caption" className="font-medium text-[10px] text-center">{act.label}</Text>
          </motion.div>
        ))}
      </Flex>
    </WidgetContainer>
  );
};
