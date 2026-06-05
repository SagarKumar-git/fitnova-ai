import { API_BASE_URL } from "../config";
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { 
  Search, Plus, Filter, Info, Award, 
  History, X, Save, Eye 
} from 'lucide-react';

interface MuscleGroup {
  id: string;
  name: string;
}

interface MuscleContribution {
  id: string;
  muscle_group_id: string;
  is_primary: boolean;
  contribution_pct: number;
  muscle_group_name: string;
}

interface ExerciseMedia {
  video_url?: string;
  thumbnail_url?: string;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment?: string;
  description?: string;
  is_custom: boolean;
  primary_muscle_group_id?: string;
  primary_muscle_group_name?: string;
  muscles: MuscleContribution[];
  media?: ExerciseMedia;
}

interface ExerciseHistory {
  exercise: Exercise;
  personal_record?: {
    best_weight: number;
    best_volume: number;
    best_estimated_1rm: number;
    record_date?: string;
  };
  sets_history: {
    set_id: string;
    weight: number;
    reps: number;
    rpe?: number;
    is_pr: boolean;
    date: string;
    estimated_1rm: number;
  }[];
  progress_curve: {
    date: string;
    estimated_1rm: number;
  }[];
}

export const ExerciseDatabase: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('');

  // Selected Detail state
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [detailData, setDetailData] = useState<ExerciseHistory | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Custom Exercise Creator
  const [showCreator, setShowCreator] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Strength');
  const [customEquipment, setCustomEquipment] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customPrimaryMuscle, setCustomPrimaryMuscle] = useState('');
  
  // Secondary muscles
  const [customSecondaryMuscle, setCustomSecondaryMuscle] = useState('');
  const [customSecondaryPct, setCustomSecondaryPct] = useState<number>(30);
  const [addedSecondaryMuscles, setAddedSecondaryMuscles] = useState<{ muscle_id: string; name: string; pct: number }[]>([]);

  // Media
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState('');
  const [creatorError, setCreatorError] = useState<string | null>(null);

  const fetchExercisesAndFilters = async () => {
    setLoading(true);
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
  let url = `${API_BASE_URL}/exercises`;
      const params = [];
      if (searchQuery) params.push(`query=${searchQuery}`);
      if (selectedMuscleFilter) params.push(`muscle_group_id=${selectedMuscleFilter}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExercises(data);
      }

      const musclesRes = await fetch(`${API_BASE_URL}/exercises/muscle-groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (musclesRes.ok) {
        const data = await musclesRes.json();
        setMuscleGroups(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercisesAndFilters();
  }, [searchQuery, selectedMuscleFilter]);

  const handleOpenDetail = async (ex: Exercise) => {
    setSelectedExercise(ex);
    setDetailLoading(true);
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/exercises/${ex.id}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddSecondaryMuscle = () => {
    if (!customSecondaryMuscle) return;
    if (addedSecondaryMuscles.find(m => m.muscle_id === customSecondaryMuscle)) return;

    const muscleName = muscleGroups.find(g => g.id === customSecondaryMuscle)?.name || "";
    setAddedSecondaryMuscles(prev => [
      ...prev,
      {
        muscle_id: customSecondaryMuscle,
        name: muscleName,
        pct: customSecondaryPct
      }
    ]);
    setCustomSecondaryMuscle('');
  };

  const handleRemoveSecondaryMuscle = (id: string) => {
    setAddedSecondaryMuscles(prev => prev.filter(m => m.muscle_id !== id));
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorError(null);

    if (!customPrimaryMuscle) {
      setCreatorError("Please select a primary muscle group.");
      return;
    }

    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    // Build contributions list
    const musclesPayload = [
      {
        muscle_group_id: customPrimaryMuscle,
        is_primary: true,
        contribution_pct: 100.0 - addedSecondaryMuscles.reduce((sum, m) => sum + m.pct, 0.0)
      },
      ...addedSecondaryMuscles.map(m => ({
        muscle_group_id: m.muscle_id,
        is_primary: false,
        contribution_pct: m.pct
      }))
    ];

    // Check if total sums to <= 100%
    const totalPct = musclesPayload.reduce((sum, m) => sum + m.contribution_pct, 0);
    if (totalPct !== 100.0 || musclesPayload[0].contribution_pct < 0) {
      setCreatorError("Sum of muscle contributions must equal exactly 100%. Please check secondary percentages.");
      return;
    }

    const payload = {
      name: customName,
      category: customCategory,
      equipment: customEquipment || null,
      description: customDescription || null,
      primary_muscle_group_id: customPrimaryMuscle,
      muscles: musclesPayload,
      media: (customVideoUrl || customThumbnailUrl) ? {
        video_url: customVideoUrl || null,
        thumbnail_url: customThumbnailUrl || null
      } : null
    };

    try {
      const response = await fetch(`${API_BASE_URL}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setCustomName('');
        setCustomEquipment('');
        setCustomDescription('');
        setCustomPrimaryMuscle('');
        setAddedSecondaryMuscles([]);
        setCustomVideoUrl('');
        setCustomThumbnailUrl('');
        setShowCreator(false);
        fetchExercisesAndFilters();
      } else {
        const err = await response.json();
        setCreatorError(err.detail || "Failed to create exercise.");
      }
    } catch (err) {
      setCreatorError("Failed to connect to backend.");
    }
  };

  // Render progression SVG path
  const render1RMSVGChart = (curve: { date: string; estimated_1rm: number }[]) => {
    if (curve.length < 2) {
      return (
        <div className="h-40 flex items-center justify-center border border-zinc-900 rounded-xl bg-zinc-950/40 text-xs text-zinc-650">
          Not enough sessions logged to map progression. Keep training!
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = 25;

    const values = curve.map(c => c.estimated_1rm);
    const minVal = Math.min(...values) * 0.95;
    const maxVal = Math.max(...values) * 1.05;
    const valRange = maxVal - minVal;

    const getX = (index: number) => padding + (index / (curve.length - 1)) * (width - 2 * padding);
    const getY = (val: number) => height - padding - ((val - minVal) / valRange) * (height - 2 * padding);

    // Build line path
    let d = `M ${getX(0)} ${getY(values[0])}`;
    for (let i = 1; i < curve.length; i++) {
      d += ` L ${getX(i)} ${getY(values[i])}`;
    }

    // Build area path for gradient
    const dArea = `${d} L ${getX(curve.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

    return (
      <div className="border border-zinc-900 rounded-2xl bg-zinc-950/60 p-4">
        <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide mb-3 flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-neonLime" />
          <span>Estimated 1RM Progressive Load Curve (kg)</span>
        </p>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c5f82a" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#c5f82a" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#18181b" strokeWidth="1" />
          <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="#18181b" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#27272a" strokeWidth="1" />

          {/* Area under curve */}
          <path d={dArea} fill="url(#chartGrad)" />

          {/* Core line */}
          <path d={d} fill="none" stroke="#c5f82a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data nodes */}
          {curve.map((node, idx) => (
            <g key={idx}>
              <circle 
                cx={getX(idx)} 
                cy={getY(node.estimated_1rm)} 
                r="4.5" 
                fill="#09090b" 
                stroke="#c5f82a" 
                strokeWidth="2.5" 
              />
              {/* node labels for first, last or peak */}
              {(idx === 0 || idx === curve.length - 1) && (
                <text 
                  x={getX(idx)} 
                  y={getY(node.estimated_1rm) - 10} 
                  fill="#c5f82a" 
                  fontSize="8" 
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {node.estimated_1rm}kg
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Exercise Library</h1>
          <p className="text-zinc-400 mt-1">Browse, filter targets, view demonstration clips, and track progress.</p>
        </div>
        
        <button 
          onClick={() => { setShowCreator(true); setCreatorError(null); }}
          className="px-5 py-2.5 bg-neonLime hover:bg-neonLime-dark text-black rounded-xl font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-1.5 align-self-start"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Custom Exercise</span>
        </button>
      </div>

      {/* Search and filter bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-neonLime"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <select 
            value={selectedMuscleFilter}
            onChange={(e) => setSelectedMuscleFilter(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-neonLime appearance-none"
          >
            <option value="">All Muscles</option>
            {muscleGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: list of exercises */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-neonLime"></div>
            </div>
          ) : exercises.length === 0 ? (
            <p className="text-zinc-650 text-center py-12 text-sm">No exercises matching criteria.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exercises.map(ex => (
                <div 
                  key={ex.id}
                  onClick={() => handleOpenDetail(ex)}
                  className={`glass-panel p-4 rounded-xl border cursor-pointer hover:bg-zinc-900/20 hover:border-zinc-700 transition flex items-center justify-between ${
                    selectedExercise?.id === ex.id 
                      ? 'border-neonLime bg-zinc-900/10' 
                      : 'border-zinc-800 bg-zinc-950/20'
                  }`}
                >
                  <div>
                    <h4 className="font-extrabold text-slate-200 text-sm">{ex.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        {ex.primary_muscle_group_name || "Hypertrophy"}
                      </span>
                      <span className="text-[10px] text-zinc-750 font-bold">&bull;</span>
                      <span className="text-[10px] text-zinc-500 font-medium">
                        {ex.equipment || "Free weights"}
                      </span>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-zinc-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: selected detail block */}
        <div className="space-y-6">
          {!selectedExercise ? (
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 bg-zinc-950/20 text-center py-16 text-zinc-500 space-y-3">
              <Info className="w-8 h-8 mx-auto text-zinc-700" />
              <p className="text-xs max-w-xs mx-auto">Select an exercise from the library to view detailed muscle engagement, PR history, demonstration videos, and 1RM progress graphs.</p>
            </div>
          ) : detailLoading ? (
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 flex items-center justify-center h-60">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-neonLime"></div>
            </div>
          ) : detailData ? (
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-6">
              {/* Title & Desc */}
              <div>
                <h3 className="text-lg font-black text-slate-100 uppercase tracking-wide">{selectedExercise.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold uppercase tracking-wide mt-1 inline-block">
                  {selectedExercise.category}
                </span>
                <p className="text-zinc-400 text-xs mt-3 leading-relaxed">
                  {selectedExercise.description || "No description provided for this movement."}
                </p>
              </div>

              {/* Media Player */}
              {selectedExercise.media?.video_url && (
                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                  <video 
                    src={selectedExercise.media.video_url} 
                    controls 
                    poster={selectedExercise.media.thumbnail_url} 
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* Muscle Contributions */}
              <div className="space-y-3">
                <h4 className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide border-b border-zinc-900 pb-1.5">Muscle Contribution</h4>
                <div className="space-y-2">
                  {selectedExercise.muscles.map((m, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className={m.is_primary ? "text-slate-200" : "text-zinc-500"}>
                          {m.muscle_group_name} {m.is_primary && <span className="text-[9px] text-neonLime font-bold uppercase">(Primary)</span>}
                        </span>
                        <span className="font-mono text-zinc-400">{m.contribution_pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${m.is_primary ? "bg-neonLime" : "bg-zinc-700"}`}
                          style={{ width: `${m.contribution_pct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Records summary */}
              <div className="space-y-3 border-t border-zinc-900 pt-4">
                <h4 className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide">Personal Records</h4>
                {detailData.personal_record ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850 text-center">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Weight</span>
                      <p className="font-black text-slate-100 text-sm font-mono mt-0.5">{detailData.personal_record.best_weight}kg</p>
                    </div>
                    <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850 text-center">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Volume</span>
                      <p className="font-black text-slate-100 text-sm font-mono mt-0.5">{detailData.personal_record.best_volume}kg</p>
                    </div>
                    <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850 text-center">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">1RM Est</span>
                      <p className="font-black text-slate-100 text-sm font-mono mt-0.5">{detailData.personal_record.best_estimated_1rm}kg</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-650">No PR logged yet. Finish a workout set to set your benchmark!</p>
                )}
              </div>

              {/* 1RM SVG Chart */}
              {render1RMSVGChart(detailData.progress_curve)}

              {/* Recent History Logs */}
              <div className="space-y-3 border-t border-zinc-900 pt-4">
                <h4 className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide flex items-center gap-1">
                  <History className="w-3.5 h-3.5" />
                  <span>Logged Sets History</span>
                </h4>
                {detailData.sets_history.length === 0 ? (
                  <p className="text-[10px] text-zinc-650">No logging history for this exercise.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {detailData.sets_history.map((h, hIdx) => (
                      <div key={hIdx} className="flex justify-between items-center text-xs py-1 px-2 bg-zinc-900/30 border border-zinc-900 rounded">
                        <span className="font-mono text-zinc-500">{h.date}</span>
                        <span className="font-semibold text-slate-350">{h.weight}kg &times; {h.reps} reps</span>
                        {h.is_pr && (
                          <span className="text-[9px] font-bold px-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">PR</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal: Custom Exercise Creator */}
      {showCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateExercise} className="glass-panel w-full max-w-xl rounded-3xl border border-zinc-850 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-lg font-black text-slate-100">Create Custom Exercise</h3>
              <button 
                type="button" 
                onClick={() => setShowCreator(false)}
                className="text-zinc-500 hover:text-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {creatorError && (
              <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/50 p-3 rounded-lg">{creatorError}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-1.5">Exercise Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Incline Dumbbell Press"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neonLime"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-1.5">Category</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-neonLime"
                >
                  <option value="Strength">Strength</option>
                  <option value="Hypertrophy">Hypertrophy</option>
                  <option value="Bodyweight">Bodyweight</option>
                  <option value="Cardio">Cardio</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-1.5">Equipment</label>
                <input 
                  type="text" 
                  placeholder="e.g. Dumbbell, Barbell, Cables"
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neonLime"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-1.5">Primary Muscle Group</label>
                <select
                  value={customPrimaryMuscle}
                  required
                  onChange={(e) => setCustomPrimaryMuscle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-neonLime"
                >
                  <option value="">Select Primary</option>
                  {muscleGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-1.5">Description</label>
              <textarea 
                placeholder="Write instructions on execution form, stance, or breathing patterns..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neonLime h-16 resize-none"
              />
            </div>

            {/* Secondary Muscle Mapping (Percentages) */}
            <div className="border-t border-zinc-900 pt-4 space-y-3">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-zinc-500">Secondary Muscles engagement</label>
              
              <div className="flex gap-2">
                <select
                  value={customSecondaryMuscle}
                  onChange={(e) => setCustomSecondaryMuscle(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-400 focus:outline-none"
                >
                  <option value="">Select Secondary Muscle</option>
                  {muscleGroups.filter(g => g.id !== customPrimaryMuscle).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                <div className="w-24 flex items-center gap-1.5">
                  <input 
                    type="number" 
                    min="5" 
                    max="80" 
                    value={customSecondaryPct}
                    onChange={(e) => setCustomSecondaryPct(parseInt(e.target.value) || 10)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-center text-slate-200"
                  />
                  <span className="text-zinc-650 text-xs">%</span>
                </div>

                <button 
                  type="button"
                  onClick={handleAddSecondaryMuscle}
                  className="px-3 bg-zinc-900 border border-zinc-800 text-neonLime text-xs font-bold rounded-xl hover:bg-zinc-850"
                >
                  Add
                </button>
              </div>

              {/* List of mapped secondary muscles */}
              {addedSecondaryMuscles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {addedSecondaryMuscles.map(m => (
                    <span key={m.muscle_id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      <span>{m.name} ({m.pct}%)</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSecondaryMuscle(m.muscle_id)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Media URLs */}
            <div className="border-t border-zinc-900 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-1.5">Demonstration Video URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://example.com/video.mp4"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neonLime"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-1.5">Poster Thumbnail URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://example.com/poster.jpg"
                  value={customThumbnailUrl}
                  onChange={(e) => setCustomThumbnailUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neonLime"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowCreator(false)}
                className="px-5 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-slate-350 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-5 py-2 bg-neonLime hover:bg-neonLime-dark text-black rounded-xl font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Exercise</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
};
