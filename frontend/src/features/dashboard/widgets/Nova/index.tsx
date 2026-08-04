import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { NovaInsight } from '../../../../design-system/ai';

export const NovaWidget: React.FC<WidgetProps> = ({ data, isLoading }) => {
  return (
    <WidgetContainer title="Nova Briefing" isLoading={isLoading}>
      <NovaInsight insightType="health" content={data?.nova?.insight || ""} />
    </WidgetContainer>
  );
};
