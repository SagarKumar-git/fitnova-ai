import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-darkBg text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen p-8 lg:p-12 relative">
        {/* Background glow dots for premium startup vibe */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-neonLime/5 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-neonCyan/5 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};
