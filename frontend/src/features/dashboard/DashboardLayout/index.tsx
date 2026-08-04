import * as React from 'react';
import { AppLayout } from '../../../design-system/layouts';

export const DashboardLayout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
};
