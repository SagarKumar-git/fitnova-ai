import * as React from 'react';
import { DashboardContext } from '../state/DashboardContext';
export const useDashboard = () => {
  const context = React.useContext(DashboardContext);
  if (context === undefined) throw new Error('useDashboard must be used within DashboardProvider');
  return context;
};
