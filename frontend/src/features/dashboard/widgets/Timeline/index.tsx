import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { Text, Flex } from '../../../../design-system/primitives';
import { Badge } from '../../../../design-system/data-display';

export const TimelineWidget: React.FC<WidgetProps> = ({ data, isLoading }) => {
  return (
    <WidgetContainer title="Up Next" isLoading={isLoading}>
      <Flex direction="col" gap="3">
        {data?.upcoming?.map((item, i) => (
          <Flex key={i} justify="between" align="center" className="border-b last:border-0 pb-2 last:pb-0">
            <Flex direction="col">
              <Text variant="bodySmall" className="font-bold">{item.title}</Text>
              <Text variant="caption" className="text-muted-foreground">{item.time}</Text>
            </Flex>
            <Badge variant="secondary" className="uppercase text-[10px]">{item.type}</Badge>
          </Flex>
        ))}
      </Flex>
    </WidgetContainer>
  );
};
