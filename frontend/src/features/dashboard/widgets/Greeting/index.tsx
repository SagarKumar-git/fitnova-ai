import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { Avatar } from '../../../../design-system/data-display';
import { Text, Flex } from '../../../../design-system/primitives';

export const GreetingWidget: React.FC<WidgetProps> = ({ data, isLoading }) => {
  return (
    <WidgetContainer isLoading={isLoading}>
      <Flex gap="4" align="center">
        <Avatar size="lg" fallback={data?.user?.name?.charAt(0)} />
        <div>
          <Text variant="headingL">Good Morning, {data?.user?.name}.</Text>
          <Text variant="body" className="text-muted-foreground">Let's crush today's goals.</Text>
        </div>
      </Flex>
    </WidgetContainer>
  );
};
