import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import {
  useEventBus,
  useNotificationService,
  useAnalytics,
} from '../platform/container/PlatformContext.tsx';
import { logger } from '../utils/logger.ts';
import { 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  Apple, 
  Droplet, 
  X
} from 'lucide-react';

interface Food {
  food_id: string;
  name: string;
  common_name?: string | null;
  aliases?: string | null;
  brand: string | null;
  barcode: string | null;
  category?: string | null;
  cuisine?: string | null;
  country_or_region?: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number | null;
  is_vegetarian?: boolean | null;
  is_vegan?: boolean | null;
  source?: string | null;
  is_custom: boolean;
}

interface FoodLog {
  log_id: string;
  meal_type: string;
  servings: number;
  logged_date: string;
  food: Food;
}

interface WaterLog {
  water_log_id: string;
  amount_ml: number;
  logged_date: string;
  created_at: string;
}

export const Nutrition: React.FC = () => {
  const { apiFetch } = useAuth();
  const eventBus = useEventBus();
  const notifications = useNotificationService();
  const analytics = useAnalytics();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('sv'));
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMealSection, setActiveMealSection] = useState<string>('Breakfast');
  
  // Search food states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [servingsToLog, setServingsToLog] = useState<number>(1.0);

  // Catalog filter and pagination states
  const [categories, setCategories] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'vegan'>('all');
  const [searchOffset, setSearchOffset] = useState<number>(0);
  const [hasMoreFoods, setHasMoreFoods] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Custom food creator states
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [customServingSize, setCustomServingSize] = useState<number>(100);
  const [customServingUnit, setCustomServingUnit] = useState('g');
  const [customCalories, setCustomCalories] = useState<number>(0);
  const [customProtein, setCustomProtein] = useState<number>(0);
  const [customCarbs, setCustomCarbs] = useState<number>(0);
  const [customFat, setCustomFat] = useState<number>(0);
  
  const [modalError, setModalError] = useState<string | null>(null);
  const [isWaterLogging, setIsWaterLogging] = useState(false);
  const [waterInput, setWaterInput] = useState<number>(250);

  // Meal types
  const mealSections = ['Breakfast', 'Pre Workout', 'Post Workout', 'Lunch', 'Dinner', 'Snack'];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [foodResponse, waterResponse] = await Promise.all([
        apiFetch(`${API_BASE_URL}/logs/nutrition?logged_date=${selectedDate}`),
        apiFetch(`${API_BASE_URL}/logs/water?logged_date=${selectedDate}`),
      ]);

      if (foodResponse.status === 401 || foodResponse.status === 403) return;

      if (foodResponse.ok) {
        const logs = await foodResponse.json();
        setFoodLogs(logs);
      }
      if (waterResponse.ok) {
        const logs = await waterResponse.json();
        setWaterLogs(logs);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error loading logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedDate]);

  // Load catalog categories and cuisines when modal opens
  useEffect(() => {
    if (showAddModal && categories.length === 0) {
      Promise.all([
        apiFetch(`${API_BASE_URL}/foods/categories`).then(r => r.ok ? r.json() : []),
        apiFetch(`${API_BASE_URL}/foods/cuisines`).then(r => r.ok ? r.json() : [])
      ]).then(([cats, cuis]) => {
        if (Array.isArray(cats)) setCategories(cats);
        if (Array.isArray(cuis)) setCuisines(cuis);
      }).catch(err => {
        if (import.meta.env.DEV) console.error("Error loading categories/cuisines:", err);
      });
    }
  }, [showAddModal, categories.length, apiFetch]);

  // Debounced search with category/cuisine/dietary filtering
  useEffect(() => {
    if (!showAddModal) return;

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append('query', searchQuery.trim());
        if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
        if (selectedCuisine && selectedCuisine !== 'All') params.append('cuisine', selectedCuisine);
        if (dietaryFilter === 'veg') params.append('is_vegetarian', 'true');
        if (dietaryFilter === 'vegan') params.append('is_vegan', 'true');
        params.append('limit', '20');
        params.append('offset', '0');

        const response = await apiFetch(`${API_BASE_URL}/foods/search?${params.toString()}`);
        if (response.status === 401 || response.status === 403) return;
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.items || []);
          setHasMoreFoods(data.has_more || false);
          setSearchOffset(data.items?.length || 0);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Food search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCategory, selectedCuisine, dietaryFilter, showAddModal, apiFetch]);

  const handleLoadMoreFoods = async () => {
    if (isLoadingMore || !hasMoreFoods) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('query', searchQuery.trim());
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedCuisine && selectedCuisine !== 'All') params.append('cuisine', selectedCuisine);
      if (dietaryFilter === 'veg') params.append('is_vegetarian', 'true');
      if (dietaryFilter === 'vegan') params.append('is_vegan', 'true');
      params.append('limit', '20');
      params.append('offset', searchOffset.toString());

      const response = await apiFetch(`${API_BASE_URL}/foods/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(prev => [...prev, ...(data.items || [])]);
        setHasMoreFoods(data.has_more || false);
        setSearchOffset(prev => prev + (data.items?.length || 0));
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Food load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLogFood = async (foodId: string) => {
    setModalError(null);
    const foodToLog = (selectedFood && selectedFood.food_id === foodId)
      ? selectedFood
      : searchResults.find(f => f.food_id === foodId);

    try {
      const response = await apiFetch(`${API_BASE_URL}/logs/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_id: foodId,
          meal_type: activeMealSection,
          servings: servingsToLog,
          logged_date: selectedDate
        })
      });

      if (response.status === 401 || response.status === 403) return;
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to log food");
      }

      setShowAddModal(false);
      setSelectedFood(null);
      setSearchQuery('');
      setSearchResults([]);
      setServingsToLog(1.0);
      fetchLogs();

      if (foodToLog) {
        eventBus.emit('MEAL_LOGGED', {
          mealId: foodId,
          mealType: activeMealSection,
          calories: Math.round(foodToLog.calories * servingsToLog),
          proteinGrams: Math.round(foodToLog.protein * servingsToLog),
          carbsGrams: Math.round(foodToLog.carbohydrates * servingsToLog),
          fatGrams: Math.round(foodToLog.fat * servingsToLog),
          timestamp: Date.now(),
        });

        analytics.track('MEAL_LOGGED', {
          foodName: foodToLog.name,
          mealType: activeMealSection,
          calories: Math.round(foodToLog.calories * servingsToLog),
        });

        notifications.notify({
          type: 'nutrition',
          title: 'Food Logged',
          message: `Added ${foodToLog.name} to ${activeMealSection}.`,
          durationMs: 3500,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log food';
      setModalError(msg);
      logger.error('[Nutrition] Log food error', { error: msg });
    }
  };

  const handleCreateCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!customName || customServingSize <= 0) {
      setModalError("Please provide name and serving size.");
      return;
    }

    try {
      const createResponse = await apiFetch(`${API_BASE_URL}/foods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName, brand: customBrand || null, barcode: customBarcode || null,
          serving_size: customServingSize, serving_unit: customServingUnit,
          calories: customCalories, protein: customProtein,
          carbohydrates: customCarbs, fat: customFat
        })
      });

      if (createResponse.status === 401 || createResponse.status === 403) return;
      if (!createResponse.ok) {
        const err = await createResponse.json();
        throw new Error(err.detail || "Failed to create food");
      }

      const createdFood = await createResponse.json();
      await handleLogFood(createdFood.food_id);

      setCustomName(''); setCustomBrand(''); setCustomBarcode('');
      setCustomServingSize(100); setCustomServingUnit('g');
      setCustomCalories(0); setCustomProtein(0); setCustomCarbs(0); setCustomFat(0);
      setShowCustomCreator(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create food';
      setModalError(msg);
      logger.error('[Nutrition] Create custom food error', { error: msg });
    }
  };

  const handleDeleteFoodLog = async (logId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/logs/nutrition/${logId}`, { method: 'DELETE' });
      if (response.status === 401 || response.status === 403) return;
      if (response.ok) {
        fetchLogs();
        notifications.notify({
          type: 'info',
          title: 'Food Log Removed',
          message: 'Entry successfully deleted.',
          durationMs: 2500,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete log';
      logger.error('[Nutrition] Failed to delete log', { error: msg });
    }
  };

  const handleLogWater = async (e: React.FormEvent) => {
    e.preventDefault();
    if (waterInput <= 0) return;
    setIsWaterLogging(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/logs/water`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_ml: waterInput, logged_date: selectedDate })
      });
      if (response.status === 401 || response.status === 403) return;
      if (response.ok) {
        const loggedAmount = waterInput;
        const currentDailyTotal = waterLogs.reduce((sum, log) => sum + log.amount_ml, 0) + loggedAmount;
        setWaterInput(250);
        fetchLogs();

        // Platform integration: EventBus, Analytics, Notifications
        eventBus.emit('WATER_LOGGED', {
          amountMl: loggedAmount,
          dailyTotalMl: currentDailyTotal,
          timestamp: Date.now(),
        });
        analytics.track('WATER_LOGGED', { amountMl: loggedAmount, dailyTotalMl: currentDailyTotal });
        notifications.notify({
          type: 'nutrition',
          title: 'Hydration Logged',
          message: `Logged ${loggedAmount}ml of water. Keep going!`,
          durationMs: 3000,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error logging water';
      logger.error('[Nutrition] Error logging water', { error: msg });
    } finally {
      setIsWaterLogging(false);
    }
  };

  const handleDeleteWaterLog = async (waterLogId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/logs/water/${waterLogId}`, { method: 'DELETE' });
      if (response.status === 401 || response.status === 403) return;
      if (response.ok) {
        fetchLogs();
        notifications.notify({
          type: 'info',
          title: 'Hydration Entry Removed',
          message: 'Water log deleted.',
          durationMs: 2500,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete water log';
      logger.error('[Nutrition] Failed to delete water log', { error: msg });
    }
  };

  // Group food logs by meal type
  const logsByMeal = mealSections.reduce((acc, section) => {
    acc[section] = foodLogs.filter(log => log.meal_type === section);
    return acc;
  }, {} as Record<string, FoodLog[]>);

  // Daily totals calculations
  const totals = foodLogs.reduce(
    (acc, log) => {
      const mult = log.servings;
      acc.calories += log.food.calories * mult;
      acc.protein += log.food.protein * mult;
      acc.carbs += log.food.carbohydrates * mult;
      acc.fats += log.food.fat * mult;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const totalWater = waterLogs.reduce((sum, log) => sum + log.amount_ml, 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-neonLime border-t-transparent animate-spin"></div>
            <p className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Assembling Diary Data</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Top controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Daily Nutrition Diary</h1>
          <p className="text-zinc-400 mt-1">Record meals, track calories, and manage custom templates.</p>
        </div>
        
        {/* Date Selector */}
        <div className="flex items-center gap-2.5 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
          <Calendar className="w-4 h-4 text-neonLime" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-slate-100 font-semibold focus:outline-none text-sm select-none"
          />
        </div>
      </div>

      {/* Grid: Diary Panel & Water tracker side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Food Logging Sections */}
        <div className="lg:col-span-2 space-y-6">
          {mealSections.map((section) => {
            const logs = logsByMeal[section] || [];
            const sectionCalories = logs.reduce((sum, log) => sum + (log.food.calories * log.servings), 0);
            
            return (
              <div key={section} className="glass-panel p-5 rounded-2xl border border-zinc-800 hover:border-zinc-800/80 transition-all duration-200">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-6 bg-neonLime rounded-full"></div>
                    <h3 className="font-extrabold text-slate-100 tracking-wide text-sm uppercase">{section}</h3>
                    <span className="text-xs text-zinc-500 font-semibold">{logs.length} items logged</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {sectionCalories > 0 && (
                      <span className="text-xs font-bold text-zinc-400">{Math.round(sectionCalories)} kcal</span>
                    )}
                    <button 
                      onClick={() => {
                        setActiveMealSection(section);
                        setShowAddModal(true);
                      }}
                      className="p-1.5 bg-zinc-900 hover:bg-neonLime/10 border border-zinc-800 hover:border-neonLime/30 text-zinc-400 hover:text-neonLime rounded-lg transition-all duration-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Logged items list */}
                {logs.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-2">No food logged for {section.toLowerCase()}.</p>
                ) : (
                  <div className="divide-y divide-zinc-900/60">
                    {logs.map((log) => {
                      const mealMacros = {
                        cal: Math.round(log.food.calories * log.servings),
                        pro: Math.round(log.food.protein * log.servings),
                        carb: Math.round(log.food.carbohydrates * log.servings),
                        fat: Math.round(log.food.fat * log.servings)
                      };

                      return (
                        <div key={log.log_id} className="py-3 flex justify-between items-center group">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-200">{log.food.name}</span>
                              {log.food.brand && (
                                <span className="text-[10px] text-zinc-500 font-medium bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">{log.food.brand}</span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {log.servings} servings ({log.servings * log.food.serving_size}{log.food.serving_unit}) •{' '}
                              <span className="text-zinc-400">{mealMacros.pro}g P | {mealMacros.carb}g C | {mealMacros.fat}g F</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-extrabold text-slate-300">{mealMacros.cal} kcal</span>
                            <button 
                              onClick={() => handleDeleteFoodLog(log.log_id)}
                              className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-950/20 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Panel: Daily Aggregates & Water Tracker */}
        <div className="space-y-6">
          {/* Daily macro totals summary card */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-neonLime/5 rounded-full blur-xl pointer-events-none"></div>
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Apple className="w-5 h-5 text-neonLime" />
              Day Totals Summary
            </h3>
            
            <div className="space-y-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900/60">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Total Calories</span>
                <span className="text-3xl font-black text-slate-100 mt-1 block">
                  {Math.round(totals.calories)} <span className="text-xs font-semibold text-zinc-500">kcal logged</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase block">Protein</span>
                  <span className="font-bold text-sm text-neonCyan">{Math.round(totals.protein)}g</span>
                </div>
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase block">Carbs</span>
                  <span className="font-bold text-sm text-slate-300">{Math.round(totals.carbs)}g</span>
                </div>
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase block">Fats</span>
                  <span className="font-bold text-sm text-orange-400">{Math.round(totals.fats)}g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Water Tracker Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-950/20 rounded-full blur-xl pointer-events-none"></div>
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-sky-400" />
              Daily Water tracker
            </h3>

            <div className="space-y-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Total Consumption</span>
                  <span className="text-3xl font-black text-slate-100 mt-1 block">
                    {totalWater} <span className="text-xs font-semibold text-zinc-500">ml</span>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-sky-950/20 border border-sky-850/50 flex items-center justify-center text-sky-400 font-extrabold text-sm">
                  {Math.round((totalWater / 3000) * 100)}%
                </div>
              </div>

              {/* Water logging form */}
              <form onSubmit={handleLogWater} className="flex gap-2">
                <input
                  type="number"
                  placeholder="Water amount (ml)"
                  value={waterInput}
                  onChange={(e) => setWaterInput(parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-900 focus:border-sky-500 rounded-xl text-slate-200 text-sm focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={isWaterLogging}
                  className="px-4 py-2 bg-sky-950/50 hover:bg-sky-900/40 text-sky-400 border border-sky-900/50 text-xs font-extrabold uppercase rounded-xl transition-all duration-200"
                >
                  Log
                </button>
              </form>

              {/* Water history diary */}
              {waterLogs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-900 space-y-2 max-h-48 overflow-y-auto">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Logged Entries</span>
                  {waterLogs.map((log) => (
                    <div key={log.water_log_id} className="flex items-center justify-between bg-zinc-900/30 p-2 rounded-lg border border-zinc-900/50 text-xs text-zinc-300">
                      <span>{log.amount_ml} ml logged</span>
                      <button 
                        onClick={() => handleDeleteWaterLog(log.water_log_id)}
                        className="text-zinc-600 hover:text-red-400 hover:bg-red-950/20 p-1 rounded"
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
      </div>

      {/* Modal: Add Food to Log */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
              <h3 className="font-extrabold text-white">Add Food to {activeMealSection}</h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setShowCustomCreator(false);
                  setSelectedFood(null);
                  setSearchQuery('');
                  setSearchResults([]);
                  setModalError(null);
                }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Error */}
            {modalError && (
              <div className="p-3 mx-5 mt-4 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-200">
                {modalError}
              </div>
            )}

            {/* Modal Content */}
            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
              
              {/* Creator vs Search toggles */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomCreator(false)}
                  className={`flex-1 py-2 text-xs font-bold uppercase border rounded-xl transition-all duration-150 ${
                    !showCustomCreator 
                      ? 'bg-neonLime/10 border-neonLime text-neonLime' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Search Database
                </button>
                <button
                  onClick={() => setShowCustomCreator(true)}
                  className={`flex-1 py-2 text-xs font-bold uppercase border rounded-xl transition-all duration-150 ${
                    showCustomCreator 
                      ? 'bg-neonCyan/10 border-neonCyan text-neonCyan' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Create Custom Food
                </button>
              </div>

              {!showCustomCreator ? (
                // Search panel
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search Roti, Litti, Dosa, Sushi, Dal..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-neonLime"
                      autoFocus
                    />
                  </div>

                  {/* Filter controls: Cuisine, Category, Dietary */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                          Cuisine
                        </label>
                        <select
                          value={selectedCuisine}
                          onChange={(e) => setSelectedCuisine(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-neonLime"
                        >
                          <option value="All">All Cuisines</option>
                          {cuisines.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                          Category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-neonLime"
                        >
                          <option value="All">All Categories</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Dietary preference pills */}
                    <div className="flex gap-2 items-center pt-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Diet:</span>
                      <button
                        type="button"
                        onClick={() => setDietaryFilter('all')}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                          dietaryFilter === 'all'
                            ? 'bg-zinc-700 text-white'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setDietaryFilter('veg')}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          dietaryFilter === 'veg'
                            ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-400 font-bold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setDietaryFilter('vegan')}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          dietaryFilter === 'vegan'
                            ? 'bg-teal-950 border border-teal-500/50 text-teal-400 font-bold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                        Vegan
                      </button>
                    </div>
                  </div>

                  {/* Search results list */}
                  {searchResults.length > 0 && (
                    <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden max-h-60 overflow-y-auto">
                      {searchResults.map((food) => (
                        <button
                          key={food.food_id}
                          onClick={() => setSelectedFood(food)}
                          className={`w-full p-3 text-left hover:bg-zinc-900/50 flex justify-between items-start text-xs transition-colors ${
                            selectedFood?.food_id === food.food_id ? 'bg-zinc-900 border-l-2 border-neonLime' : ''
                          }`}
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-200 text-sm">{food.name}</span>
                              <span className="text-[10px] text-zinc-500">({food.serving_size}{food.serving_unit})</span>
                              {food.is_vegetarian !== undefined && food.is_vegetarian !== null && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded border ${
                                  food.is_vegan
                                    ? 'bg-teal-950/40 text-teal-300 border-teal-800/40'
                                    : food.is_vegetarian
                                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                                    : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                                }`}>
                                  {food.is_vegan ? 'Vegan' : food.is_vegetarian ? 'Veg' : 'Non-Veg'}
                                </span>
                              )}
                            </div>
                            {food.common_name && (
                              <p className="text-[11px] text-zinc-400 italic line-clamp-1">{food.common_name}</p>
                            )}
                            <div className="flex gap-1.5 flex-wrap pt-0.5">
                              {food.cuisine && (
                                <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                                  {food.cuisine}
                                </span>
                              )}
                              {food.category && (
                                <span className="text-[9px] bg-zinc-800/60 text-zinc-400 px-1.5 py-0.5 rounded">
                                  {food.category}
                                </span>
                              )}
                              {food.source && (
                                <span className="text-[9px] text-zinc-500">
                                  {food.source}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-extrabold text-slate-200 block">{Math.round(food.calories)} kcal</span>
                            <span className="text-[10px] text-zinc-500 block">
                              P: {Math.round(food.protein)}g | C: {Math.round(food.carbohydrates)}g | F: {Math.round(food.fat)}g
                            </span>
                          </div>
                        </button>
                      ))}

                      {hasMoreFoods && (
                        <div className="p-2 text-center bg-zinc-950/80">
                          <button
                            type="button"
                            onClick={handleLoadMoreFoods}
                            disabled={isLoadingMore}
                            className="text-xs text-neonLime hover:underline font-bold disabled:opacity-50 py-1"
                          >
                            {isLoadingMore ? "Loading more foods..." : "Load More Foods"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {isSearching && (
                    <p className="text-xs text-zinc-500 text-center py-2 animate-pulse">Searching foods...</p>
                  )}

                  {!isSearching && searchResults.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-4">No matching foods found. Create a custom food instead!</p>
                  )}

                  {/* Quantity and Submit */}
                  {selectedFood && (
                    <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-4 animate-fadeIn">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Selected Portion:</span>
                        <span className="font-bold text-slate-200">
                          {selectedFood.name} ({selectedFood.serving_size}{selectedFood.serving_unit})
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Servings Portion</label>
                          <input
                            type="number"
                            step="0.1"
                            value={servingsToLog}
                            onChange={(e) => setServingsToLog(parseFloat(e.target.value) || 0.0)}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none"
                            required
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold block">Calories to Log</span>
                          <span className="text-xl font-black text-neonLime">{Math.round(selectedFood.calories * servingsToLog)} kcal</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleLogFood(selectedFood.food_id)}
                        className="w-full py-2.5 bg-gradient-to-r from-neonLime to-neonCyan text-black font-bold uppercase rounded-xl text-xs hover:shadow-[0_0_15px_rgba(163,230,53,0.2)] transition-all duration-150"
                      >
                        Log to {activeMealSection}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Custom food creator panel
                <form onSubmit={handleCreateCustomFood} className="space-y-3.5 text-xs text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-500 font-bold mb-1 uppercase tracking-wider text-[10px]">Food Name</label>
                      <input 
                        type="text" 
                        placeholder="Roti Cooked"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none focus:border-neonLime"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 font-bold mb-1 uppercase tracking-wider text-[10px]">Brand (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="Homemade"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 font-bold mb-1 uppercase tracking-wider text-[10px]">Barcode (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="890123..."
                        value={customBarcode}
                        onChange={(e) => setCustomBarcode(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-zinc-500 font-bold mb-1 uppercase tracking-wider text-[10px]">Serving Size</label>
                        <input 
                          type="number" 
                          value={customServingSize}
                          onChange={(e) => setCustomServingSize(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-500 font-bold mb-1 uppercase tracking-wider text-[10px]">Unit</label>
                        <input 
                          type="text" 
                          value={customServingUnit}
                          onChange={(e) => setCustomServingUnit(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900 pt-3">
                    <p className="font-bold text-[10px] text-zinc-400 mb-2 uppercase tracking-widest">Nutrients per serving size</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-zinc-500 font-semibold mb-1 text-[9px] uppercase text-center">Calories</label>
                        <input 
                          type="number" 
                          value={customCalories}
                          onChange={(e) => setCustomCalories(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-500 font-semibold mb-1 text-[9px] uppercase text-center">Protein (g)</label>
                        <input 
                          type="number" 
                          value={customProtein}
                          onChange={(e) => setCustomProtein(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-500 font-semibold mb-1 text-[9px] uppercase text-center">Carbs (g)</label>
                        <input 
                          type="number" 
                          value={customCarbs}
                          onChange={(e) => setCustomCarbs(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-500 font-semibold mb-1 text-[9px] uppercase text-center">Fat (g)</label>
                        <input 
                          type="number" 
                          value={customFat}
                          onChange={(e) => setCustomFat(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center border-t border-zinc-900 pt-4 mt-2">
                    <div>
                      <label className="block text-zinc-500 font-bold mb-1 uppercase tracking-wider text-[10px]">Log Servings Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        value={servingsToLog}
                        onChange={(e) => setServingsToLog(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block">Calories logging</span>
                      <span className="text-lg font-black text-neonCyan">{Math.round(customCalories * servingsToLog)} kcal</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-neonCyan to-neonLime text-black font-bold uppercase rounded-xl text-xs hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-150 mt-3"
                  >
                    Save & Log Food
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
