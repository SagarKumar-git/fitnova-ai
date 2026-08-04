import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { HealthRing } from '../../../../design-system/data-display';
import { Text, Flex } from '../../../../design-system/primitives';

export const GoalsWidget: React.FC<WidgetProps> = ({ data, isLoading }) => {
  return (
    <WidgetContainer title="Daily Rings" isLoading={isLoading}>
      <Flex justify="around" align="center" className="py-2">
        <Flex direction="col" align="center" gap="2">
          <HealthRing value={data?.metrics?.protein?.current || 0} max={data?.metrics?.protein?.max || 100} size={80} strokeWidth={8} color="stroke-red-500">
            <Text variant="bodySmall" className="font-bold">{data?.metrics?.protein?.current}</Text>
          </HealthRing>
          <Text variant="caption" className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Protein</Text>
        </Flex>
        
        <Flex direction="col" align="center" gap="2">
          <HealthRing value={data?.metrics?.water?.current || 0} max={data?.metrics?.water?.max || 100} size={80} strokeWidth={8} color="stroke-blue-500">
            <Text variant="bodySmall" className="font-bold">{data?.metrics?.water?.current}</Text>
          </HealthRing>
          <Text variant="caption" className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Water</Text>
        </Flex>
        
        <Flex direction="col" align="center" gap="2">
          <HealthRing value={80} max={100} size={80} strokeWidth={8} color="stroke-green-500">
            <Text variant="bodySmall" className="font-bold">1800</Text>
          </HealthRing>
          <Text variant="caption" className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Cal Left</Text>
        </Flex>
      </Flex>
    </WidgetContainer>
  );
};
