import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { API_BASE_URL } from '../config';
import { 
  Lightbulb, 
  Droplet, 
  Dumbbell, 
  Award, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Calendar, 
  Zap, 
  Sparkles, 
  TrendingUp,
  Apple
} from 'lucide-react';

interface AIInsight {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
}

export const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('fitnova_token');
    if (!token) {
      setError("Authentication token missing. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ai/insights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error("Failed to compile AI insights recommendation engine.");
      }
      const data = await response.json();
      setInsights(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  // Compute stats based on insights
  const getScorePercentage = (type: string): number => {
    const insight = insights.find(ins => ins.type === type);
    if (!insight) return 70; // fallback default
    
    if (type === 'hydration') {
      if (insight.status === 'success') return 100;
      const match = insight.message.match(/below target for (\d+) days/);
      if (match) {
        const daysBelow = Number(match[1]);
        return Math.round(((7 - daysBelow) / 7) * 100);
      }
      return 60;
    }
    
    if (type === 'protein') {
      if (insight.status === 'success') return 100;
      const match = insight.message.match(/protein goal on (\d+) of the last 7 days/);
      if (match) {
        const daysMet = Number(match[1]);
        return Math.round((daysMet / 7) * 100);
      }
      return 50;
    }
    
    if (type === 'workout') {
      const match = insight.message.match(/consistency score is (\d+)%/);
      if (match) return Number(match[1]);
      return 60;
    }

    return 80; // recovery default
  };

  const hydrationScore = getScorePercentage('hydration');
  const nutritionScore = getScorePercentage('protein');
  const workoutScore = getScorePercentage('workout');
  const recoveryScore = 85; 
  const overallScore = Math.round((hydrationScore + nutritionScore + workoutScore + recoveryScore) / 4);

  // Extract weight prediction stats from message
  const getWeightInsightDetails = () => {
    const weightInsight = insights.find(ins => ins.type === 'weight');
    if (!weightInsight) return { rate: '0.5', target: '75.0', date: 'Next month', next30: '74.0' };
    
    const rateMatch = weightInsight.message.match(/rate of ([\d.]+) kg\/week/);
    const targetMatch = weightInsight.message.match(/target weight of ([\d.]+) kg/);
    const dateMatch = weightInsight.message.match(/around ([A-Za-z]+ \d+, \d{4})/);
    const next30Match = weightInsight.message.match(/in 30 days: ([\d.]+) kg/);

    return {
      rate: rateMatch ? rateMatch[1] : '0.5',
      target: targetMatch ? targetMatch[1] : '75.0',
      date: dateMatch ? dateMatch[1] : 'Soon',
      next30: next30Match ? next30Match[1] : '74.0'
    };
  };

  const weightDetails = getWeightInsightDetails();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'hydration': return <Droplet className="w-5 h-5 text-neonCyan" />;
      case 'protein': return <Zap className="w-5 h-5 text-neonLime" />;
      case 'workout': return <Dumbbell className="w-5 h-5 text-indigo-400" />;
      case 'weight': return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'prediction': return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'achievement': return <Award className="w-5 h-5 text-amber-500" />;
      default: return <Lightbulb className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getInsightStyles = (status: string) => {
    switch (status) {
      case 'success': return {
        border: 'border-neonLime/30',
        glow: 'shadow-[0_0_15px_rgba(163,230,53,0.06)]',
        bg: 'bg-neonLime/5',
        icon: <CheckCircle2 className="w-4 h-4 text-neonLime" />
      };
      case 'warning': return {
        border: 'border-amber-500/30',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.06)]',
        bg: 'bg-amber-500/5',
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />
      };
      default: return {
        border: 'border-neonCyan/30',
        glow: 'shadow-[0_0_15px_rgba(6,182,212,0.06)]',
        bg: 'bg-neonCyan/5',
        icon: <Info className="w-4 h-4 text-neonCyan" />
      };
    }
  };

  return (
    <Layout>
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-neonLime" />
            <span className="text-[10px] font-bold text-neonLime bg-neonLime/10 px-2 py-0.5 rounded border border-neonLime/20 uppercase tracking-widest">
              Biometric Intelligence
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonLime to-neonCyan">Coaching Insights</span>
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm mt-1">
            Personalized behavioral analysis, recovery metrics, and weight progress timeline predictions.
          </p>
        </div>

        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="self-start sm:self-auto py-2.5 px-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer animate-fade-in"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-neonLime' : ''}`} />
          <span>Recalculate Insights</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-8 animate-pulse">
          <div className="h-44 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-zinc-900 rounded-xl border border-zinc-800"></div>
              ))}
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800"></div>
              <div className="h-32 bg-zinc-900 rounded-xl border border-zinc-800"></div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-950/20 border border-red-900/50 rounded-2xl max-w-xl mx-auto text-center mt-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="font-extrabold text-white text-lg mb-1">Calculation Engine Failure</h3>
          <p className="text-red-200/80 text-xs mb-6 max-w-sm mx-auto">{error}</p>
          <button 
            onClick={fetchInsights}
            className="py-2.5 px-6 bg-red-500 hover:bg-red-600 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all duration-200"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          
          {/* Health Score Overview Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neonLime/5 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Overall Score Dial */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="54" strokeWidth="8" stroke="#18181b" fill="transparent" />
                  <circle 
                    cx="64" 
                    cy="64" 
                    r="54" 
                    strokeWidth="8" 
                    stroke="url(#dial-grad)" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - overallScore / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="dial-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#a3e635" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-black text-slate-100">{overallScore}</span>
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Health Index</span>
                </div>
              </div>

              {/* Individual Breakdown Grid */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Hydration */}
                <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Hydration</span>
                    <Droplet className="w-3.5 h-3.5 text-neonCyan" />
                  </div>
                  <span className="text-lg font-black text-slate-200">{hydrationScore}%</span>
                  <div className="w-full bg-zinc-900 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-neonCyan rounded-full" style={{ width: `${hydrationScore}%` }}></div>
                  </div>
                </div>

                {/* Nutrition */}
                <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Nutrition</span>
                    <Apple className="w-3.5 h-3.5 text-neonLime" />
                  </div>
                  <span className="text-lg font-black text-slate-200">{nutritionScore}%</span>
                  <div className="w-full bg-zinc-900 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-neonLime rounded-full" style={{ width: `${nutritionScore}%` }}></div>
                  </div>
                </div>

                {/* Workout */}
                <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Consistency</span>
                    <Dumbbell className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-lg font-black text-slate-200">{workoutScore}%</span>
                  <div className="w-full bg-zinc-900 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${workoutScore}%` }}></div>
                  </div>
                </div>

                {/* Recovery */}
                <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Recovery</span>
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <span className="text-lg font-black text-slate-200">{recoveryScore}%</span>
                  <div className="w-full bg-zinc-900 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${recoveryScore}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Insights recommendations & goal forecasting panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Recommendations Column */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-base font-bold text-white tracking-wide uppercase">Smart Coaching Insights</h2>
              
              {insights.length > 0 ? (
                insights.map((ins) => {
                  const style = getInsightStyles(ins.status);
                  return (
                    <div 
                      key={ins.id} 
                      className={`p-5 glass-panel rounded-2xl border ${style.border} ${style.glow} flex gap-4 items-start transition-all duration-300 hover:border-zinc-700`}
                    >
                      <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl shrink-0 mt-0.5">
                        {getInsightIcon(ins.type)}
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">{ins.title}</h3>
                          <div className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase">
                            <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${style.bg}`}>
                              {style.icon}
                              <span>{ins.status}</span>
                            </span>
                            <span className={`px-1.5 py-0.5 rounded border ${
                              ins.priority === 'high' ? 'bg-red-950/30 border-red-900/50 text-red-400' :
                              ins.priority === 'medium' ? 'bg-amber-950/30 border-amber-900/50 text-amber-500' :
                              'bg-zinc-900 border-zinc-850 text-zinc-500'
                            }`}>
                              {ins.priority} Priority
                            </span>
                          </div>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">{ins.message}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-zinc-900/10 border border-zinc-900 rounded-2xl text-zinc-500 text-xs">
                  No personal activity data found yet. Generate AI Coach programs and log water/protein habits to unlock custom feedback alerts.
                </div>
              )}
            </div>

            {/* Goal Timeline & Weight Forecast Column */}
            <div className="space-y-6">
              <h2 className="text-base font-bold text-white tracking-wide uppercase">Predictions & Milestones</h2>
              
              {/* Predictions Panel */}
              <div className="glass-panel p-5 rounded-2xl border border-zinc-850 relative overflow-hidden">
                <h3 className="text-xs font-black text-zinc-400 mb-4 tracking-wider uppercase flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neonLime" />
                  Fitness Goal Forecast
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-500 font-bold">Target Weight</span>
                    <strong className="text-white font-extrabold">{weightDetails.target} kg</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-500 font-bold">Progress Rate</span>
                    <strong className="text-white font-extrabold">{weightDetails.rate} kg/week</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-500 font-bold">Next 30 Days Forecast</span>
                    <strong className="text-neonCyan font-extrabold">{weightDetails.next30} kg</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-500 font-bold">Est. Completion Date</span>
                    <span className="px-2 py-0.5 bg-neonLime/15 border border-neonLime/25 text-neonLime font-extrabold rounded text-[10px]">
                      {weightDetails.date}
                    </span>
                  </div>
                </div>

                <div className="mt-5 p-3 bg-neonLime/5 border border-neonLime/10 rounded-xl text-[10px] text-zinc-400 leading-relaxed">
                  💡 <strong>Tip</strong>: Focus on hit macro ranges and workout intensity to accelerate your forecast timelines.
                </div>
              </div>

              {/* Near Complete Badges Alert */}
              {insights.some(ins => ins.type === 'achievement') && (
                <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-lg pointer-events-none"></div>
                  
                  <h3 className="text-xs font-black text-amber-500 mb-3.5 tracking-wider uppercase flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Badge Alert!
                  </h3>

                  <div className="text-xs space-y-2">
                    {insights.filter(ins => ins.type === 'achievement').map((ach) => (
                      <p key={ach.id} className="text-zinc-300 leading-relaxed font-medium">
                        {ach.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </Layout>
  );
};
