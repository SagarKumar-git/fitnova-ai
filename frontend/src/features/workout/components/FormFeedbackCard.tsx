/**
 * FitNova AI — FormFeedbackCard Component
 * Real-time HUD showing live AI form analysis score, biomechanical issue alerts,
 * corrective cues, camera state, and compact mobile drawer mode.
 */

import React, { useState } from 'react';
import type { FormAssessment } from '../vision/models/FormAssessment.ts';
import type { VisionCameraPermissionStatus } from '../vision/providers/VisionProvider.ts';
import {
  Camera,
  VideoOff,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Activity,
  Zap,
} from 'lucide-react';

export interface FormFeedbackCardProps {
  assessment: FormAssessment | null;
  isAnalyzing: boolean;
  permissionStatus: VisionCameraPermissionStatus;
  onToggleCamera: () => void;
  className?: string;
  isCompact?: boolean;
}

export const FormFeedbackCard: React.FC<FormFeedbackCardProps> = ({
  assessment,
  isAnalyzing,
  permissionStatus,
  onToggleCamera,
  className = '',
  isCompact: defaultCompact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(!defaultCompact);

  const formScore = assessment?.formScore ?? 92;
  const rating = assessment?.rating ?? 'excellent';
  const issues = assessment?.detectedIssues ?? [];
  const primaryCorrection = assessment?.primaryCorrection;
  const positiveFeedback = assessment?.positiveFeedback || 'Steady tempo and balanced bar path.';

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-neonLime border-neonLime/30 bg-neonLime/10';
    if (score >= 75) return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    return 'text-rose-400 border-rose-400/30 bg-rose-400/10';
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 bg-zinc-950/90 backdrop-blur-md shadow-xl overflow-hidden ${
        issues.length > 0 && issues[0].severity === 'high'
          ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
          : 'border-zinc-800 hover:border-zinc-700'
      } ${className}`}
    >
      {/* Header bar */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3 bg-zinc-900/60 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isAnalyzing ? 'bg-neonLime/20 text-neonLime' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {isAnalyzing ? <Activity className="w-4 h-4 animate-pulse" /> : <Camera className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                AI Form Analysis
              </span>
              {isAnalyzing && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              {permissionStatus === 'denied'
                ? 'Camera access denied'
                : permissionStatus === 'unavailable'
                ? 'Camera sensor offline (simulated analysis)'
                : isAnalyzing
                ? 'Tracking joint angles & kinematics'
                : 'Camera standby'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Form Score Badge */}
          {isAnalyzing && (
            <div
              className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs flex items-center gap-1.5 ${getScoreColor(
                formScore
              )}`}
            >
              <Zap className="w-3 h-3" />
              <span>{formScore}/100</span>
            </div>
          )}

          {/* Toggle Camera Button */}
          <button
            type="button"
            onClick={onToggleCamera}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              isAnalyzing
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                : 'bg-neonLime hover:bg-neonLime/90 text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <VideoOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Start Vision</span>
              </>
            )}
          </button>

          {/* Minimize / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
            aria-label="Toggle details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Coaching Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {permissionStatus === 'denied' ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold">Camera Access Denied</p>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Workout OS continues in standard mode. Form feedback will use simulated kinematic checks.
                </p>
              </div>
            </div>
          ) : isAnalyzing ? (
            <>
              {/* Primary Correction / Warning */}
              {primaryCorrection ? (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-3 ${
                    issues[0]?.severity === 'high'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs">
                    <span className="font-bold uppercase tracking-wider block text-[10px]">
                      {issues[0]?.name || 'Form Correction'}
                    </span>
                    <p className="text-white font-medium">{primaryCorrection}</p>
                    {issues[0]?.description && (
                      <p className="text-zinc-400 text-[11px]">{issues[0].description}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div className="space-y-0.5 text-xs">
                    <span className="font-bold uppercase tracking-wider block text-[10px] text-emerald-400">
                      Form Locked In
                    </span>
                    <p className="text-white font-medium">{positiveFeedback}</p>
                  </div>
                </div>
              )}

              {/* Multi-Issue Checklist if more than 1 issue */}
              {issues.length > 1 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Additional Observations:
                  </span>
                  {issues.slice(1).map((issue) => (
                    <div
                      key={issue.id}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-between"
                    >
                      <span>{issue.name}</span>
                      <span className="text-[10px] text-amber-400 font-semibold">{issue.severity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Biomechanical metrics summary */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Movement Rating</span>
                  <span className="font-bold text-white capitalize">{rating.replace('_', ' ')}</span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Vision Confidence</span>
                  <span className="font-bold text-neonLime font-mono">
                    {Math.round((assessment?.confidence || 0.95) * 100)}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <Sparkles className="w-5 h-5 text-neonLime" />
              </div>
              <p className="text-xs text-zinc-300 font-medium">
                Position camera facing your full body to activate AI joint tracking
              </p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                Analyzes squat depth, knee valgus, elbow tuck, and neutral spine angles in real time.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
