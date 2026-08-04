import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { Text, Flex } from '../../../../design-system/primitives';

export const TodaysFocusWidget: React.FC<WidgetProps> = ({ isLoading }) => {
  return (
    <WidgetContainer title="Today's Focus" isLoading={isLoading}>
      <Flex direction="col" justify="center" align="center" className="h-full text-center p-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-3xl text-primary">🎯</span>
        </div>
        <Text variant="headingS" className="font-bold mb-2">Build & Recover</Text>
        <Text variant="bodySmall" className="text-muted-foreground">Focus on heavy compound lifts and aggressive rehydration.</Text>
      </Flex>
    </WidgetContainer>
  );
};
