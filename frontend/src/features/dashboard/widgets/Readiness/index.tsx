import * as React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import type { WidgetProps } from '../../types';
import { Battery, Activity, Moon, TrendingUp, Sparkles } from 'lucide-react';

export const ReadinessWidget: React.FC<WidgetProps> = ({ data, isLoading }) => {
  const readiness = data?.user?.readiness || 0;
  
  // Derived state based on Sprint 3.8 recovery logic
  const isOptimal = readiness >= 80;
  const isModerate = readiness >= 50 && readiness < 80;

  const colorClass = isOptimal ? 'text-neonLime' : isModerate ? 'text-amber-400' : 'text-red-500';
  const bgClass = isOptimal ? 'bg-neonLime/10 border-neonLime/30' : isModerate ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30';
  const intensityBadge = isOptimal ? 'Full Intensity' : isModerate ? 'Moderate Load' : 'Active Recovery';

  return (
    <WidgetContainer title="Adaptive Readiness" isLoading={isLoading}>
      <div className="flex flex-col gap-4">
        
        {/* Top: Main Score & Intensity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${bgClass}`}>
              <span className={`text-2xl font-black ${colorClass}`}>{readiness}</span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Recovery Score</div>
              <div className="flex items-center gap-1.5">
                <Battery className={`w-3.5 h-3.5 ${colorClass}`} />
                <span className="text-sm font-bold text-white">{intensityBadge}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: Biometric Signals */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
            <Activity className="w-4 h-4 text-zinc-400 mb-1" />
            <div className="text-xs font-black text-white">HRV</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Optimal</div>
          </div>
          <div className="bg-black/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
            <Moon className="w-4 h-4 text-zinc-400 mb-1" />
            <div className="text-xs font-black text-white">7.5h</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Sleep</div>
          </div>
          <div className="bg-black/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-4 h-4 text-zinc-400 mb-1" />
            <div className="text-xs font-black text-white">1.1</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Load</div>
          </div>
        </div>

        {/* Bottom: Nova Recommendation */}
        <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/20 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">
              Nova Adaptation
            </span>
          </div>
          <p className="text-xs text-zinc-300 ml-1 leading-relaxed">
            {isOptimal 
              ? "Your recovery signals indicate readiness for controlled progression. Train as planned."
              : isModerate 
                ? "Moderate systemic fatigue detected. Nova may recommend slight volume reductions during your session."
                : "Multiple recovery signals indicate elevated fatigue. Recommend substituting with an active recovery session."
            }
          </p>
        </div>
        
      </div>
    </WidgetContainer>
  );
};
