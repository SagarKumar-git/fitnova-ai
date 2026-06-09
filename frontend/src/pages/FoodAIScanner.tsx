import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle,
  RefreshCw,
  Clock
} from 'lucide-react';

interface FoodScanLog {
  id: string;
  image_filename: string;
  image_hash: string | null;
  status: string;
  processing_time_ms: number | null;
  food_name: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  confidence_score: number | null;
  created_at: string;
  food_id: string | null;

  // Phase F-3.5 fields
  meal_name?: string | null;
  detected_items?: string[] | null;
  confidence_per_item?: Record<string, number> | null;
  serving_size_estimation?: string | null;
  estimated_weight_g?: number | null;
  health_score?: number | null;
  nutrition_confidence?: number | null;
  goal_alignment?: {
    weight_loss?: number;
    muscle_gain?: number;
    maintenance?: number;
  } | null;
  recommendation?: string | null;
  healthier_alternative?: string | null;
  annotations?: Array<{
    name: string;
    confidence: number;
    bounding_box: [number, number, number, number];
  }> | null;
}

interface ScanStats {
  total_scans: number;
  weekly_scans: number;
  most_scanned_food: string | null;
  total_calories_scanned: number;
}

export const FoodAIScanner: React.FC = () => {
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState<ScanStats>({
    total_scans: 0,
    weekly_scans: 0,
    most_scanned_food: null,
    total_calories_scanned: 0
  });
  const [history, setHistory] = useState<FoodScanLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  // Upload & Scan states
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Selected prediction for review/logging
  const [activeScan, setActiveScan] = useState<FoodScanLog | null>(null);
  
  // Edited values state
  const [editedName, setEditedName] = useState<string>('');
  const [editedCalories, setEditedCalories] = useState<number>(0);
  const [editedProtein, setEditedProtein] = useState<number>(0);
  const [editedCarbs, setEditedCarbs] = useState<number>(0);
  const [editedFat, setEditedFat] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(1.0);
  
  // Logging parameters
  const [mealType, setMealType] = useState<string>('Breakfast');
  const [servings, setServings] = useState<number>(1.0);
  const [logDate, setLogDate] = useState<string>(new Date().toLocaleDateString('sv'));
  const [loggingMeal, setLoggingMeal] = useState<boolean>(false);
  const [logSuccess, setLogSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const mealTypes = ['Breakfast', 'Pre Workout', 'Post Workout', 'Lunch', 'Dinner', 'Snack'];

  // Helper to map backend image paths to full URLs
  const getImageUrl = (path: string) => {
    if (!path) return '';
    const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
    return `${base}${path}`;
  };

  const fetchStats = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/v1/ai/food-scan/stats`);
      if (response.status === 401 || response.status === 403) return;
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching stats:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/v1/ai/food-scan/history`);
      if (response.status === 401 || response.status === 403) return;
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
        setHistoryError(null);
      } else {
        setHistoryError('Failed to load scan history.');
      }
    } catch (err) {
      setHistoryError('Network error loading scan history.');
      if (import.meta.env.DEV) console.error("Error fetching history:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchHistory()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleUpload(e.target.files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    setError(null);
    setLogSuccess(false);

    // Frontend validation
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setError("Unsupported format. Please upload JPG, JPEG, PNG, or WEBP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds maximum allowed size of 10MB.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiFetch(`${API_BASE_URL}/v1/ai/food-scan`, {
        method: 'POST',
        body: formData
      });

      if (response.status === 401 || response.status === 403) return;

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to scan image");
      }

      const scanResult: FoodScanLog = await response.json();
      
      // Select scan for review
      setActiveScan(scanResult);
      setEditedName(scanResult.meal_name || scanResult.food_name || 'Unknown Meal');
      setEditedCalories(Math.round(scanResult.calories || 0));
      setEditedProtein(Math.round(scanResult.protein || 0));
      setEditedCarbs(Math.round(scanResult.carbohydrates || 0));
      setEditedFat(Math.round(scanResult.fat || 0));
      setConfidence(scanResult.confidence_score || 0.30);
      
      // Refresh timeline/stats
      await Promise.all([fetchStats(), fetchHistory()]);
    } catch (err: any) {
      setError(err.message || "An error occurred during scanning");
    } finally {
      setUploading(false);
    }
  };

  const handleLogMeal = async () => {
    if (!activeScan) return;

    setLoggingMeal(true);
    setError(null);
    setLogSuccess(false);

    try {
      // Determine if the user has modified values compared to the initial scan
      const isModified = 
        editedName.trim() !== (activeScan.food_name || '').trim() ||
        editedCalories !== Math.round(activeScan.calories || 0) ||
        editedProtein !== Math.round(activeScan.protein || 0) ||
        editedCarbs !== Math.round(activeScan.carbohydrates || 0) ||
        editedFat !== Math.round(activeScan.fat || 0);

      let targetFoodId = activeScan.food_id;

      // If user modified values OR there was no matched food_id (e.g. Unknown Meal),
      // we must create a custom food item first.
      if (isModified || !targetFoodId) {
        const foodResponse = await apiFetch(`${API_BASE_URL}/foods`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editedName.trim(),
            brand: "AI Estimate",
            barcode: null,
            serving_size: 100.0,
            serving_unit: "g",
            calories: editedCalories,
            protein: editedProtein,
            carbohydrates: editedCarbs,
            fat: editedFat
          })
        });

        if (foodResponse.status === 401 || foodResponse.status === 403) return;
        if (!foodResponse.ok) {
          const errData = await foodResponse.json();
          throw new Error(errData.detail || "Failed to register custom food item");
        }

        const customFood = await foodResponse.json();
        targetFoodId = customFood.food_id;
      }

      // Log the food log entry
      const logResponse = await apiFetch(`${API_BASE_URL}/logs/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_id: targetFoodId,
          meal_type: mealType,
          servings: servings,
          logged_date: logDate
        })
      });

      if (logResponse.status === 401 || logResponse.status === 403) return;
      if (!logResponse.ok) {
        const errData = await logResponse.json();
        throw new Error(errData.detail || "Failed to log meal to nutrition logs");
      }

      setLogSuccess(true);
      setActiveScan(null);
      // Refresh stats
      await fetchStats();
    } catch (err: any) {
      setError(err.message || "Failed to log meal");
    } finally {
      setLoggingMeal(false);
    }
  };

  const handleDeleteScan = async (id: string) => {
    if (activeScan && activeScan.id === id) {
      setActiveScan(null);
    }

    try {
      const response = await apiFetch(`${API_BASE_URL}/v1/ai/food-scan/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 401 || response.status === 403) return;

      if (response.ok) {
        await Promise.all([fetchStats(), fetchHistory()]);
      } else {
        setError('Failed to delete scan. Please try again.');
      }
    } catch (err) {
      setError('Network error while deleting scan. Please try again.');
      if (import.meta.env.DEV) console.error("Failed to delete scan log:", err);
    }
  };

  const selectScanFromHistory = (scan: FoodScanLog) => {
    setActiveScan(scan);
    setEditedName(scan.meal_name || scan.food_name || 'Unknown Meal');
    setEditedCalories(Math.round(scan.calories || 0));
    setEditedProtein(Math.round(scan.protein || 0));
    setEditedCarbs(Math.round(scan.carbohydrates || 0));
    setEditedFat(Math.round(scan.fat || 0));
    setConfidence(scan.confidence_score || 0.30);
    setLogSuccess(false);
    setError(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-neonCyan border-t-transparent animate-spin"></div>
            <p className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Booting AI Vision Engine</p>
          </div>
        </div>
      </Layout>
    );
  }

  // History load error state with retry
  const HistoryErrorView = historyError ? (
    <div className="py-6 text-center">
      <p className="text-xs text-red-300 mb-3">{historyError}</p>
      <button
        onClick={fetchHistory}
        className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl hover:border-neonLime/50 transition-all"
      >
        Retry
      </button>
    </div>
  ) : null;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white">Food AI Vision Scanner</h1>
        <p className="text-zinc-400 mt-1">Snap or upload meal images to estimate calories and log nutrition instantly.</p>
      </div>

      {/* Statistics Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-5 rounded-2xl border border-zinc-900/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-neonLime/5 rounded-full blur-xl pointer-events-none"></div>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Total Scans</span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">{stats.total_scans}</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-zinc-900/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-neonCyan/5 rounded-full blur-xl pointer-events-none"></div>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Weekly Scans</span>
          <span className="text-2xl font-black text-neonCyan mt-1 block">{stats.weekly_scans}</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-zinc-900/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full blur-xl pointer-events-none"></div>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Total Calories Scanned</span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">{Math.round(stats.total_calories_scanned)} kcal</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-zinc-900/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-neonLime/5 rounded-full blur-xl pointer-events-none"></div>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Most Scanned Food</span>
          <span className="text-sm font-bold text-neonLime mt-2.5 block truncate">
            {stats.most_scanned_food || "None logged"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Upload and Editor Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Uploader Card */}
          <div 
            className={`glass-panel p-8 rounded-2xl border-2 border-dashed transition-all duration-200 text-center ${
              dragActive ? 'border-neonLime bg-neonLime/5' : 'border-zinc-800 hover:border-zinc-700'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
            />

            {uploading ? (
              <div className="py-6 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-neonLime border-t-transparent animate-spin rounded-full"></div>
                <div>
                  <p className="text-slate-200 font-bold text-sm">Analyzing image...</p>
                  <p className="text-xs text-zinc-500 mt-1">Applying Pillow quality reduction & matching heuristics</p>
                </div>
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center">
                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 text-neonLime mb-4 shadow-lg">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-wider">Upload Food Image</h3>
                <p className="text-xs text-zinc-500 mt-1 mb-4">Drag and drop file here, or click to browse</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all duration-150"
                >
                  Choose File
                </button>
                <p className="text-[10px] text-zinc-600 mt-3">Accepts: JPG, JPEG, PNG, WEBP (Max: 10MB)</p>
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/40 text-xs text-red-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {logSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-200 flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Meal logged successfully!</span>
                <p className="text-[10px] text-emerald-400/80 mt-0.5">Estimated nutritional values have been synchronized with your Daily Nutrition Diary.</p>
              </div>
            </div>
          )}

          {/* Active Scan Review and Customization Editor */}
          {activeScan && (
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-6 animate-fadeIn text-left">
              
              {/* Header: Name, Health Score, Tags */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-900">
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">AI Meal Classification</span>
                  <h4 className="text-lg font-black text-slate-100 mt-0.5 truncate">
                    {activeScan.meal_name || editedName}
                  </h4>
                  {/* Dynamic Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {editedProtein >= 20 && (
                      <span className="px-2 py-0.5 rounded bg-neonCyan/10 text-neonCyan text-[9px] font-bold uppercase border border-neonCyan/20">
                        High Protein
                      </span>
                    )}
                    {editedFat >= 20 && (
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[9px] font-bold uppercase border border-orange-500/20">
                        High Fat
                      </span>
                    )}
                    {editedCarbs <= 15 && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-bold uppercase border border-purple-500/20">
                        Low Carb
                      </span>
                    )}
                    {(activeScan.goal_alignment?.weight_loss || 5) >= 7 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase border border-emerald-500/20">
                        Weight Loss Friendly
                      </span>
                    )}
                    {(activeScan.goal_alignment?.muscle_gain || 5) >= 7 && (
                      <span className="px-2 py-0.5 rounded bg-neonLime/10 text-neonLime text-[9px] font-bold uppercase border border-neonLime/20">
                        Muscle Gain Friendly
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Health Score</span>
                    <span className="text-[8px] text-zinc-400 block mt-0.5">Scale 1-10</span>
                  </div>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border font-mono font-black text-base ${
                    (activeScan.health_score || 6) >= 8 
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                      : (activeScan.health_score || 6) >= 5 
                      ? 'bg-amber-950/30 border-amber-500/30 text-amber-400' 
                      : 'bg-red-950/30 border-red-500/30 text-red-400'
                  }`}>
                    {activeScan.health_score || 6}
                  </div>
                </div>
              </div>

              {/* Bounding box low confidence warning */}
              {confidence < 0.5 && (
                <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>Low confidence prediction. Please verify macros and details before logging.</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: Bounding Box Image, Item Confidence list, Recommendations */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Annotated Image Container */}
                  <div className="w-full aspect-square rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950 relative group shadow-inner">
                    <img 
                      src={getImageUrl(activeScan.image_filename)} 
                      alt="Scanned Food"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Bounding box overlays */}
                    {activeScan.annotations && activeScan.annotations.map((ann, idx) => {
                      if (!ann.bounding_box || ann.bounding_box.length !== 4) return null;
                      const [ymin, xmin, ymax, xmax] = ann.bounding_box;
                      const top = ymin / 10;
                      const left = xmin / 10;
                      const width = (xmax - xmin) / 10;
                      const height = (ymax - ymin) / 10;
                      
                      return (
                        <div 
                          key={idx}
                          className="absolute border-2 border-neonLime/70 bg-neonLime/5 transition-all hover:bg-neonLime/15"
                          style={{
                            top: `${top}%`,
                            left: `${left}%`,
                            width: `${width}%`,
                            height: `${height}%`,
                          }}
                        >
                          <span className="absolute -top-5 left-0 bg-zinc-950/90 text-neonLime text-[8px] font-black px-1 py-0.5 rounded border border-neonLime/30 whitespace-nowrap shadow-md">
                            {ann.name} ({Math.round(ann.confidence * 100)}%)
                          </span>
                        </div>
                      );
                    })}

                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] text-zinc-400 font-mono">
                      {(activeScan.processing_time_ms || 0) > 0 
                        ? `${activeScan.processing_time_ms?.toFixed(0)} ms` 
                        : 'Cached'}
                    </div>
                  </div>

                  {/* Portions & Confidence Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Portion & Weight</span>
                      <p className="text-xs text-slate-300 mt-1.5">
                        Scale: <span className="text-neonLime font-bold capitalize">{activeScan.serving_size_estimation || "medium"}</span>
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Weight: <span className="text-slate-200 font-bold">~{activeScan.estimated_weight_g || 350}g</span>
                      </p>
                    </div>
                    <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Analysis Accuracy</span>
                      <p className="text-xl font-black text-neonCyan mt-1">
                        {Math.round((activeScan.nutrition_confidence || activeScan.confidence_score || 0.85) * 100)}%
                      </p>
                      <span className="text-[8px] text-zinc-650 block mt-0.5">Confidence Level</span>
                    </div>
                  </div>

                  {/* Detected Items Progress Bars */}
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Detected Ingredients</span>
                    <div className="space-y-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                      {activeScan.detected_items && activeScan.detected_items.map((item, index) => {
                        const conf = (activeScan.confidence_per_item && activeScan.confidence_per_item[item]) || activeScan.confidence_score || 0.85;
                        return (
                          <div key={index} className="space-y-0.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-semibold text-zinc-300">{item}</span>
                              <span className="font-mono text-neonLime text-[10px]">{Math.round(conf * 100)}%</span>
                            </div>
                            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-neonLime h-full rounded-full"
                                style={{ width: `${conf * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {(!activeScan.detected_items || activeScan.detected_items.length === 0) && (
                        <span className="text-xs italic text-zinc-600 block text-center py-2">No individual ingredients detected.</span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Side: Goals, Alternatives, Logging Form */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Fitness Goal Alignment */}
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Fitness Goal Compatibility</span>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-900/60 text-center">
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Weight Loss</span>
                        <span className={`text-sm font-black mt-1 block ${(activeScan.goal_alignment?.weight_loss || 5) >= 7 ? 'text-emerald-400' : (activeScan.goal_alignment?.weight_loss || 5) >= 5 ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {activeScan.goal_alignment?.weight_loss || 5}/10
                        </span>
                        <div className="w-full bg-zinc-900 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${(activeScan.goal_alignment?.weight_loss || 5) >= 7 ? 'bg-emerald-500' : (activeScan.goal_alignment?.weight_loss || 5) >= 5 ? 'bg-amber-500' : 'bg-zinc-800'}`}
                            style={{ width: `${(activeScan.goal_alignment?.weight_loss || 5) * 10}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-900/60 text-center">
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Muscle Gain</span>
                        <span className={`text-sm font-black mt-1 block ${(activeScan.goal_alignment?.muscle_gain || 5) >= 7 ? 'text-emerald-400' : (activeScan.goal_alignment?.muscle_gain || 5) >= 5 ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {activeScan.goal_alignment?.muscle_gain || 5}/10
                        </span>
                        <div className="w-full bg-zinc-900 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${(activeScan.goal_alignment?.muscle_gain || 5) >= 7 ? 'bg-emerald-500' : (activeScan.goal_alignment?.muscle_gain || 5) >= 5 ? 'bg-amber-500' : 'bg-zinc-800'}`}
                            style={{ width: `${(activeScan.goal_alignment?.muscle_gain || 5) * 10}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-900/60 text-center">
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Maintenance</span>
                        <span className={`text-sm font-black mt-1 block ${(activeScan.goal_alignment?.maintenance || 5) >= 7 ? 'text-emerald-400' : (activeScan.goal_alignment?.maintenance || 5) >= 5 ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {activeScan.goal_alignment?.maintenance || 5}/10
                        </span>
                        <div className="w-full bg-zinc-900 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${(activeScan.goal_alignment?.maintenance || 5) >= 7 ? 'bg-emerald-500' : (activeScan.goal_alignment?.maintenance || 5) >= 5 ? 'bg-amber-500' : 'bg-zinc-800'}`}
                            style={{ width: `${(activeScan.goal_alignment?.maintenance || 5) * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendation & Healthier Alternative */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="bg-zinc-950/30 p-3.5 rounded-xl border border-zinc-900/60">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[9px] font-bold uppercase tracking-wider mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-neonLime" /> AI Recommendation
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {activeScan.recommendation || "Portion macros look standard. Enjoy your meal!"}
                      </p>
                    </div>
                    <div className="bg-emerald-950/10 p-3.5 rounded-xl border border-emerald-900/20">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-bold uppercase tracking-wider mb-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Healthier Alternative
                      </div>
                      <p className="text-xs text-emerald-300 leading-relaxed">
                        {activeScan.healthier_alternative || "Consider roasted whole foods instead."}
                      </p>
                    </div>
                  </div>

                  {/* Daily Nutrition Impact */}
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Daily Nutrition Impact (2,000 kcal baseline)</span>
                    <div className="grid grid-cols-4 gap-2 bg-zinc-950/20 p-3 rounded-xl border border-zinc-900/60">
                      <div className="text-center">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase">Calories</span>
                        <span className="block text-xs font-bold text-slate-200 mt-1">
                          {Math.round(((editedCalories * servings) / 2000) * 100)}%
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase">Protein</span>
                        <span className="block text-xs font-bold text-neonCyan mt-1">
                          {Math.round(((editedProtein * servings) / 130) * 100)}%
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase">Carbs</span>
                        <span className="block text-xs font-bold text-slate-400 mt-1">
                          {Math.round(((editedCarbs * servings) / 220) * 100)}%
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase">Fat</span>
                        <span className="block text-xs font-bold text-orange-400 mt-1">
                          {Math.round(((editedFat * servings) / 65) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form Editor */}
                  <div className="space-y-4 pt-2 border-t border-zinc-900">
                    
                    {/* Name field */}
                    <div>
                      <label className="block text-zinc-500 font-bold mb-1 uppercase tracking-wider text-[9px]">Logged Food Name</label>
                      <input 
                        type="text" 
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none focus:border-neonLime text-xs"
                        required
                      />
                    </div>

                    {/* Macros input grid */}
                    <div>
                      <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Nutrient Values (per 100g serving)</label>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <span className="block text-center text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Calories</span>
                          <input 
                            type="number"
                            value={editedCalories}
                            onChange={(e) => setEditedCalories(parseInt(e.target.value) || 0)}
                            className="w-full px-1 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-center font-bold text-xs"
                          />
                        </div>
                        <div>
                          <span className="block text-center text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Protein</span>
                          <input 
                            type="number"
                            value={editedProtein}
                            onChange={(e) => setEditedProtein(parseInt(e.target.value) || 0)}
                            className="w-full px-1 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-neonCyan text-center font-bold text-xs"
                          />
                        </div>
                        <div>
                          <span className="block text-center text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Carbs</span>
                          <input 
                            type="number"
                            value={editedCarbs}
                            onChange={(e) => setEditedCarbs(parseInt(e.target.value) || 0)}
                            className="w-full px-1 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-300 text-center font-bold text-xs"
                          />
                        </div>
                        <div>
                          <span className="block text-center text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Fat</span>
                          <input 
                            type="number"
                            value={editedFat}
                            onChange={(e) => setEditedFat(parseInt(e.target.value) || 0)}
                            className="w-full px-1 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-orange-400 text-center font-bold text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Logging Parameters */}
                    <div className="bg-zinc-950/20 p-4 rounded-xl border border-zinc-900">
                      <span className="block font-bold text-[9px] text-zinc-500 mb-2.5 uppercase tracking-wider">Diary Parameters</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-zinc-500 font-semibold mb-1 text-[9px] uppercase">Meal Type</label>
                          <select 
                            value={mealType} 
                            onChange={(e) => setMealType(e.target.value)}
                            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-200 text-xs focus:outline-none"
                          >
                            {mealTypes.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-zinc-500 font-semibold mb-1 text-[9px] uppercase">Servings</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={servings}
                            onChange={(e) => setServings(parseFloat(e.target.value) || 0.0)}
                            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-200 text-xs text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-500 font-semibold mb-1 text-[9px] uppercase">Logged Date</label>
                          <input 
                            type="date"
                            value={logDate}
                            onChange={(e) => setLogDate(e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-200 text-xs text-center font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleLogMeal}
                        disabled={loggingMeal}
                        className="flex-1 py-2.5 bg-gradient-to-r from-neonLime to-neonCyan text-black font-bold uppercase rounded-xl text-xs hover:shadow-[0_0_15px_rgba(163,230,53,0.15)] transition-all duration-150 flex items-center justify-center gap-1.5"
                      >
                        {loggingMeal ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Logging...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Log to Nutrition Diary
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveScan(null)}
                        className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold uppercase rounded-xl transition-all duration-150"
                      >
                        Discard
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            </div>
          )}

        </div>

        {/* Right Panel: Scan History Timeline */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 relative overflow-hidden">
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-neonCyan" />
              Scan History Timeline
            </h3>

            {history.length === 0 && !historyError ? (
              <div className="py-8 text-center text-zinc-600">
                <p className="text-xs italic">No scan logs available.</p>
                <p className="text-[10px] mt-1">Uploaded food images will appear here chronologically.</p>
              </div>
            ) : historyError ? HistoryErrorView : (
              <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                {history.map((scan) => (
                  <div 
                    key={scan.id}
                    onClick={() => selectScanFromHistory(scan)}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer group transition-all duration-200 text-left ${
                      activeScan?.id === scan.id 
                        ? 'bg-zinc-900 border-neonLime shadow-lg shadow-neonLime/5' 
                        : 'bg-zinc-950/60 border-zinc-900/80 hover:bg-zinc-900/30 hover:border-zinc-800'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-zinc-900 bg-zinc-950">
                      <img 
                        src={getImageUrl(scan.image_filename)} 
                        alt="history thumbnail" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-200 truncate pr-2">
                          {scan.food_name || 'Unknown Meal'}
                        </span>
                        <span className="text-[8px] text-zinc-500 font-mono">
                          {new Date(scan.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {scan.calories ? `${Math.round(scan.calories)} kcal` : '0 kcal'} •{' '}
                        <span className="text-zinc-400 font-mono">{(scan.confidence_score ? scan.confidence_score * 100 : 30).toFixed(0)}% AI</span>
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScan(scan.id);
                      }}
                      className="p-1.5 text-zinc-650 hover:text-red-400 hover:bg-red-950/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </Layout>
  );
};
