import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { Stat } from '../../../../design-system/data-display';

export const ReadinessWidget: React.FC<WidgetProps> = ({ data, isLoading }) => {
  return (
    <WidgetContainer title="Readiness" isLoading={isLoading}>
      <Stat title="Daily Score" value={data?.user?.readiness || 0} trend="up" delta="+2" />
    </WidgetContainer>
  );
};
