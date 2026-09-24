import React from 'react';
import { Activity } from 'lucide-react';

interface AuthBrandingProps {
  subtitle?: string;
}

export const AuthBranding: React.FC<AuthBrandingProps> = ({
  subtitle = 'YOUR INTELLIGENT ATHLETIC PARTNER',
}) => {
  return (
    <div className="flex flex-col items-center mb-8 select-none">
      {/* Heartbeat Badge */}
      <div className="relative mb-3 group">
        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#39FF14]/20 via-[#A8FF00]/15 to-[#DFFF00]/25 p-px shadow-[0_0_20px_rgba(57,255,20,0.2)]">
          <div className="w-full h-full bg-[#04111F]/90 backdrop-blur-md rounded-2xl flex items-center justify-center border border-[rgba(163,255,0,0.25)]">
            <Activity className="w-7 h-7 text-[#39FF14] stroke-[2.4] animate-heartbeat drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]" />
          </div>
        </div>
        {/* Ambient backlight */}
        <div className="absolute inset-0 -z-10 rounded-2xl bg-[#39FF14]/20 blur-md scale-95" />
      </div>

      {/* Main Title: FITNOVA AI */}
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
        <span>FITNOVA</span>
        <span className="bg-gradient-to-r from-[#39FF14] via-[#A8FF00] to-[#DFFF00] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(57,255,20,0.35)]">
          AI
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-[11px] sm:text-xs text-[#94A3B8] font-semibold tracking-widest mt-1.5 uppercase text-center">
        {subtitle}
      </p>
    </div>
  );
};
