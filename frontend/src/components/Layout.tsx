import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-darkBg text-slate-100 relative">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-neonLime to-neonCyan rounded-lg flex items-center justify-center neon-glow-lime">
            <span className="text-black font-black text-sm">F</span>
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            FITNOVA <span className="text-neonLime">AI</span>
          </span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Sidebar Navigation Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 transform lg:transform-none lg:static ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } transition-transform duration-300 ease-in-out`}>
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 lg:hidden"
        />
      )}
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen p-8 lg:p-12 pt-24 lg:pt-12 relative">
        {/* Background glow dots for premium startup vibe */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-neonLime/5 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-neonCyan/5 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>
        
        <div className="w-full max-w-7xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};
