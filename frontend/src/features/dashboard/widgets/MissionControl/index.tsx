import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { Text, Flex } from '../../../../design-system/primitives';
import { Badge } from '../../../../design-system/data-display';
import { motion } from 'framer-motion';

export const MissionControlWidget: React.FC<WidgetProps> = ({ data, isLoading }) => {
  return (
    <WidgetContainer isLoading={isLoading} pin>
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <Flex direction="col" gap="4" className="flex-1">
          <div>
            <Text variant="headingXL" className="tracking-tight font-extrabold mb-1">Good Morning, {data?.user?.name}.</Text>
            <Flex gap="3" align="center">
              <Badge variant="default" className="bg-primary/20 text-primary border-0">Recovery: {data?.user?.recovery}</Badge>
              <Text variant="caption" className="text-muted-foreground font-medium">Readiness: {data?.user?.readiness}</Text>
            </Flex>
          </div>
          <div className="bg-muted/30 p-4 rounded-xl border border-muted/50">
            <Text variant="bodySmall" className="font-semibold text-primary mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Nova Says
            </Text>
            <Text variant="body" className="italic text-foreground/80 leading-relaxed">"{data?.nova?.insight}"</Text>
          </div>
        </Flex>
        <Flex direction="col" gap="3" className="w-full md:w-64 bg-card p-4 rounded-2xl border shadow-sm">
          <Text variant="bodySmall" className="uppercase font-bold tracking-wider text-muted-foreground">Today's Mission</Text>
          <div className="flex flex-col gap-2">
            {data?.mission?.tasks?.map((task, i) => (
              <Flex key={i} gap="2" align="center">
                <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center" />
                <Text variant="bodySmall" className="font-medium">{task}</Text>
              </Flex>
            ))}
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25"
          >
            Start Workout
          </motion.button>
        </Flex>
      </div>
    </WidgetContainer>
  );
};
