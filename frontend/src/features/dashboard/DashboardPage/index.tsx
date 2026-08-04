import * as React from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { DashboardProvider } from '../state/DashboardContext';
import { DashboardLayout } from '../DashboardLayout';
import { useDashboard } from '../hooks/useDashboard';
import { WidgetRegistry } from '../registry/WidgetRegistry';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const DashboardGrid: React.FC = () => {
  const { data, isLoading } = useDashboard();
  
  return (
    <motion.div 
      className="p-4 md:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="w-full">
        <WidgetRegistry.MissionControl data={data || undefined} isLoading={isLoading} />
      </motion.div>
      
      <motion.div variants={itemVariants} className="w-full">
        <WidgetRegistry.QuickActions data={data || undefined} isLoading={isLoading} />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="h-full">
            <WidgetRegistry.AIBriefing data={data || undefined} isLoading={isLoading} />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <WidgetRegistry.TodaysFocus data={data || undefined} isLoading={isLoading} />
          </motion.div>
        </div>
        
        <div className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="h-full">
            <WidgetRegistry.Readiness data={data || undefined} isLoading={isLoading} />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <WidgetRegistry.Goals data={data || undefined} isLoading={isLoading} />
          </motion.div>
        </div>
        
        <div className="flex flex-col gap-6 lg:col-span-1 md:col-span-2">
          <motion.div variants={itemVariants} className="h-full">
            <WidgetRegistry.Timeline data={data || undefined} isLoading={isLoading} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export const DashboardPage: React.FC = () => {
  return (
    <DashboardProvider>
      <DashboardLayout>
        <DashboardGrid />
      </DashboardLayout>
    </DashboardProvider>
  );
};
