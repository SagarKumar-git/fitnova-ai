import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { Text, Flex } from '../../../../design-system/primitives';

export const AIBriefingWidget: React.FC<WidgetProps> = ({ data, isLoading }) => {
  return (
    <WidgetContainer title="Executive Briefing" isLoading={isLoading} favorite>
      <Flex direction="col" gap="4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
            <Text variant="caption" className="text-muted-foreground uppercase text-[10px] tracking-wider font-bold">Energy</Text>
            <Text variant="body" className="font-bold">{data?.nova?.energy}</Text>
          </div>
          <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
            <Text variant="caption" className="text-muted-foreground uppercase text-[10px] tracking-wider font-bold">Hydration</Text>
            <Text variant="body" className="font-bold">{data?.nova?.hydration}</Text>
          </div>
        </div>
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
          <Text variant="bodySmall" className="font-bold text-primary mb-1">Forecast</Text>
          <Text variant="bodySmall">{data?.nova?.forecast}</Text>
        </div>
      </Flex>
    </WidgetContainer>
  );
};
