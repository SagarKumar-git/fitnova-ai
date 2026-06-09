import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { 
  LineChart as ChartIcon, 
  Scale, 
  TrendingDown, 
  Calendar, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';


interface WeightLog {
  id: string;
  weight: number;
  recorded_at: string;
  source: string;
}

export const Analytics: React.FC = () => {
  const { apiFetch } = useAuth();
  const [history, setHistory] = useState<WeightLog[]>([]);
  const [targetWeight, setTargetWeight] = useState<number>(70);
  const [loading, setLoading] = useState(true);
  
  // Logging states
  const [weightInput, setWeightInput] = useState<number>(75);
  const [sourceInput, setSourceInput] = useState<string>('manual_entry');
  const [dateInput, setDateInput] = useState<string>(new Date().toLocaleDateString('sv'));
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  const fetchData = async () => {
    try {
      const [profileResp, historyResp] = await Promise.all([
        apiFetch(`${API_BASE_URL}/profile`),
        apiFetch(`${API_BASE_URL}/profile/weight-history`),
      ]);

      if (profileResp.status === 401 || profileResp.status === 403) return;

      if (profileResp.ok) {
        const profileData = await profileResp.json();
        setTargetWeight(profileData.target_weight);
        setWeightInput(profileData.weight);
      }
      if (historyResp.ok) {
        const historyData = await historyResp.json();
        setHistory(historyData);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to load weight metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (weightInput < 20 || weightInput > 400) {
      setError("Weight must be between 20kg and 400kg.");
      return;
    }

    setIsLogging(true);
    try {
      const timestamp = new Date(dateInput).toISOString();
      const response = await apiFetch(`${API_BASE_URL}/profile/weight-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: weightInput, source: sourceInput, recorded_at: timestamp })
      });

      if (response.status === 401 || response.status === 403) return;

      if (!response.ok) throw new Error("Failed to log weight entry.");

      setSuccess("Weight logged successfully!");
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLogging(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-neonCyan border-t-transparent animate-spin"></div>
            <p className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Assembling Analytics Charts</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate stats
  const startingWeight = history.length > 0 ? history[0].weight : weightInput;
  const currentWeight = history.length > 0 ? history[history.length - 1].weight : weightInput;
  const netChange = currentWeight - startingWeight;

  // Chart configuration
  const chartWidth = 600;
  const chartHeight = 240;
  const padding = 30;

  // Build charting elements if we have data points
  let svgPathD = '';
  let points: { x: number; y: number; weight: number; label: string }[] = [];
  let minW = 50;
  let maxW = 100;
  let targetY = chartHeight / 2;

  if (history.length > 0) {
    const weightsList = history.map(h => h.weight);
    minW = Math.min(...weightsList, targetWeight) - 3;
    maxW = Math.max(...weightsList, targetWeight) + 3;
    const wRange = maxW - minW;

    points = history.map((item, idx) => {
      const x = padding + (idx / Math.max(history.length - 1, 1)) * (chartWidth - 2 * padding);
      const y = chartHeight - padding - ((item.weight - minW) / wRange) * (chartHeight - 2 * padding);
      
      const dateObj = new Date(item.recorded_at);
      const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      return { x, y, weight: item.weight, label };
    });

    svgPathD = points.reduce((d, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${d} L ${p.x} ${p.y}`;
    }, '');

    // Target reference line
    targetY = chartHeight - padding - ((targetWeight - minW) / wRange) * (chartHeight - 2 * padding);
  }

  return (
    <Layout>
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
          <ChartIcon className="text-neonCyan w-8 h-8" />
          Weight Progress Analytics
        </h1>
        <p className="text-zinc-400 mt-1">Review weight trends, log check-ins, and track targets.</p>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-200">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/40 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Current Weight */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 text-left">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Current Weight</span>
          <span className="text-3xl font-black text-slate-100 mt-1 block">
            {currentWeight} <span className="text-xs font-semibold text-zinc-500">kg</span>
          </span>
          <span className="text-[10px] text-zinc-400 block mt-2">Latest verified log</span>
        </div>

        {/* Target Weight */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 text-left">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Target Goal Weight</span>
          <span className="text-3xl font-black text-neonCyan mt-1 block">
            {targetWeight} <span className="text-xs font-semibold text-zinc-500">kg</span>
          </span>
          <span className="text-[10px] text-zinc-400 block mt-2">Baseline goal target</span>
        </div>

        {/* Starting Weight */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 text-left">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Starting Weight</span>
          <span className="text-3xl font-black text-slate-400 mt-1 block">
            {startingWeight} <span className="text-xs font-semibold text-zinc-500">kg</span>
          </span>
          <span className="text-[10px] text-zinc-400 block mt-2">Logged during onboarding</span>
        </div>

        {/* Net Change */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 text-left">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Net Progress</span>
          <span className={`text-3xl font-black mt-1 block ${netChange <= 0 ? 'text-neonLime' : 'text-orange-500'}`}>
            {netChange > 0 ? `+${netChange.toFixed(1)}` : `${netChange.toFixed(1)}`} <span className="text-xs font-semibold text-zinc-500">kg</span>
          </span>
          <span className="text-[10px] text-zinc-400 block mt-2">Difference since onboarding</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Weight SVGs Progress Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 relative overflow-hidden">
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-neonCyan" />
              Weight History Timeline
            </h3>

            {history.length < 2 ? (
              <div className="py-20 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl">
                Log at least 2 weight checkpoints to generate your progress timeline graph.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <svg 
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                  className="w-full h-auto text-zinc-400 select-none overflow-visible"
                >
                  {/* Grid Lines */}
                  <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#1f2937" strokeWidth="0.5" />
                  <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#1f2937" strokeWidth="1" />
                  
                  {/* Target Weight Dashed Reference line */}
                  <line 
                    x1={padding} 
                    y1={targetY} 
                    x2={chartWidth - padding} 
                    y2={targetY} 
                    stroke="#06b6d4" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4" 
                    opacity="0.6"
                  />
                  <text 
                    x={chartWidth - padding - 80} 
                    y={targetY - 6} 
                    fill="#06b6d4" 
                    fontSize="9" 
                    fontWeight="bold" 
                    opacity="0.8"
                  >
                    Target: {targetWeight} kg
                  </text>

                  {/* Draw main line chart path */}
                  <path 
                    d={svgPathD} 
                    fill="none" 
                    stroke="url(#limeGradient)" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                    strokeLinejoin="round" 
                  />

                  {/* Dot points */}
                  {points.map((p, idx) => (
                    <g key={idx} className="group cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="5" 
                        fill="#a3e635" 
                        stroke="#09090b" 
                        strokeWidth="1.5"
                        className="transition-all duration-150 hover:r-7"
                      />
                      <text 
                        x={p.x} 
                        y={p.y - 12} 
                        fill="#f1f5f9" 
                        fontSize="9" 
                        fontWeight="bold"
                        textAnchor="middle" 
                        className="opacity-90 bg-black"
                      >
                        {p.weight}
                      </text>
                      <text 
                        x={p.x} 
                        y={chartHeight - padding + 15} 
                        fill="#6b7280" 
                        fontSize="9" 
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {p.label}
                      </text>
                    </g>
                  ))}

                  {/* Gradients */}
                  <defs>
                    <linearGradient id="limeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a3e635" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
          </div>

          {/* Weight history table list */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-4">Weight Log Records</h3>
            {history.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No weight entries logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-900 font-bold uppercase text-[9px] text-zinc-500">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Weight</th>
                      <th className="py-2.5">Source</th>
                      <th className="py-2.5 text-right">Net Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 font-medium">
                    {history.map((log, idx) => {
                      const dateObj = new Date(log.recorded_at);
                      const displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                      const change = idx === 0 ? 0 : log.weight - history[idx - 1].weight;
                      
                      let sourceName = "Manual Entry";
                      if (log.source === "profile_update") sourceName = "Profile Onboarding";
                      if (log.source === "weekly_checkin") sourceName = "Weekly Check-in";

                      return (
                        <tr key={log.id}>
                          <td className="py-3 text-slate-300 font-semibold">{displayDate}</td>
                          <td className="py-3 text-slate-100 font-bold text-sm">{log.weight} kg</td>
                          <td className="py-3">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              log.source === "profile_update" 
                                ? "bg-zinc-900 text-zinc-400 border border-zinc-800" 
                                : "bg-neonCyan/10 text-neonCyan border border-neonCyan/20"
                            }`}>
                              {sourceName}
                            </span>
                          </td>
                          <td className={`py-3 text-right font-bold ${change < 0 ? 'text-neonLime' : change > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                            {idx === 0 ? '-' : change > 0 ? `+${change.toFixed(1)} kg` : `${change.toFixed(1)} kg`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Manual Weight Log Form */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-neonLime" />
              Log Check-In Weight
            </h3>

            <form onSubmit={handleLogWeight} className="space-y-4 text-left text-xs">
              {/* Weight */}
              <div>
                <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider text-[10px]">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-900 focus:border-neonLime rounded-xl text-slate-200 focus:outline-none text-sm font-semibold"
                  required
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider text-[10px]">Log Check-In Type</label>
                <select
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-900 focus:border-neonLime rounded-xl text-slate-200 focus:outline-none"
                >
                  <option value="manual_entry">Manual Check-In</option>
                  <option value="weekly_checkin">Weekly Target Check-In</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider text-[10px]">Recorded Date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-900 focus:border-neonLime rounded-xl text-slate-200 focus:outline-none text-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLogging}
                className="w-full py-3.5 bg-gradient-to-r from-neonLime to-neonCyan text-black font-extrabold uppercase rounded-xl tracking-wider text-xs hover:shadow-[0_0_15px_rgba(163,230,53,0.25)] transition-all duration-200 mt-2"
              >
                {isLogging ? "Saving Entry..." : "Submit Weight Check-In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};
