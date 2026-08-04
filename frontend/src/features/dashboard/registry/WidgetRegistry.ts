import * as React from 'react';
import { MissionControlWidget } from '../widgets/MissionControl';
import { ReadinessWidget } from '../widgets/Readiness';
import { TimelineWidget } from '../widgets/Timeline';
import { GoalsWidget } from '../widgets/Goals';
import { AIBriefingWidget } from '../widgets/AIBriefing';
import { QuickActionsWidget } from '../widgets/QuickActions';
import { TodaysFocusWidget } from '../widgets/TodaysFocus';
import type { WidgetProps } from '../types';

export const WidgetRegistry: Record<string, React.FC<WidgetProps>> = {
  MissionControl: MissionControlWidget,
  AIBriefing: AIBriefingWidget,
  QuickActions: QuickActionsWidget,
  TodaysFocus: TodaysFocusWidget,
  Readiness: ReadinessWidget,
  Timeline: TimelineWidget,
  Goals: GoalsWidget
};
