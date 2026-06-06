import { API_BASE_URL } from "../config";
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
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
  brand: string | null;
  barcode: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
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
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      // 1. Fetch Food logs
      const foodResponse = await fetch(`${API_BASE_URL}/logs/nutrition?logged_date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (foodResponse.ok) {
        const logs = await foodResponse.json();
        const response = { data: logs };
        const nutritionLogs = logs;
        console.log("Nutrition API Response", response.data);
        console.log("Nutrition State", nutritionLogs);
        setFoodLogs(logs);
      }

      // 2. Fetch Water logs
      const waterResponse = await fetch(`${API_BASE_URL}/logs/water?logged_date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (waterResponse.ok) {
        const logs = await waterResponse.json();
        setWaterLogs(logs);
      }
    } catch (err) {
      console.error("Error loading logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedDate]);

  // Handle food search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([]);
        return;
      }

      const token = localStorage.getItem('fitnova_token');
      try {
       const response = await fetch(`${API_BASE_URL}/foods?query=${searchQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results);
        }
      } catch (err) {
        console.error("Food search error:", err);
      }
    }, 300); // Debounce queries

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Log food submission
  const handleLogFood = async (foodId: string) => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;
    setModalError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/logs/nutrition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          food_id: foodId,
          meal_type: activeMealSection,
          servings: servingsToLog,
          logged_date: selectedDate
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to log food");
      }

      // Success
      setShowAddModal(false);
      setSelectedFood(null);
      setSearchQuery('');
      setSearchResults([]);
      setServingsToLog(1.0);
      fetchLogs();
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  // Custom food creator submission
  const handleCreateCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;
    setModalError(null);

    if (!customName || customServingSize <= 0) {
      setModalError("Please provide name and serving size.");
      return;
    }

    try {
      // 1. Create custom food
      const createResponse = await fetch(`${API_BASE_URL}/foods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: customName,
          brand: customBrand || null,
          barcode: customBarcode || null,
          serving_size: customServingSize,
          serving_unit: customServingUnit,
          calories: customCalories,
          protein: customProtein,
          carbohydrates: customCarbs,
          fat: customFat
        })
      });

      if (!createResponse.ok) {
        const err = await createResponse.json();
        throw new Error(err.detail || "Failed to create food");
      }

      const createdFood = await createResponse.json();
      
      // 2. Log this newly created food
      await handleLogFood(createdFood.food_id);
      
      // Reset form
      setCustomName('');
      setCustomBrand('');
      setCustomBarcode('');
      setCustomServingSize(100);
      setCustomServingUnit('g');
      setCustomCalories(0);
      setCustomProtein(0);
      setCustomCarbs(0);
      setCustomFat(0);
      setShowCustomCreator(false);
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleDeleteFoodLog = async (logId: string) => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/logs/nutrition/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchLogs();
      }
    } catch (err) {
      console.error("Failed to delete log:", err);
    }
  };

  const handleLogWater = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('fitnova_token');
    if (!token || waterInput <= 0) return;

    setIsWaterLogging(true);
    try {
     const response = await fetch(`${API_BASE_URL}/logs/water`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount_ml: waterInput,
          logged_date: selectedDate
        })
      });

      if (response.ok) {
        setWaterInput(250);
        fetchLogs();
      }
    } catch (err) {
      console.error("Error logging water:", err);
    } finally {
      setIsWaterLogging(false);
    }
  };

  const handleDeleteWaterLog = async (waterLogId: string) => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
     const response = await fetch(`${API_BASE_URL}/logs/water/${waterLogId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchLogs();
      }
    } catch (err) {
      console.error("Failed to delete water log:", err);
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
                      placeholder="Search Roti, Rice, Dal..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-neonLime"
                      autoFocus
                    />
                  </div>

                  {/* Search results list */}
                  {searchResults.length > 0 && (
                    <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden max-h-48 overflow-y-auto">
                      {searchResults.map((food) => (
                        <button
                          key={food.food_id}
                          onClick={() => setSelectedFood(food)}
                          className={`w-full p-3 text-left hover:bg-zinc-900/50 flex justify-between items-center text-xs transition-colors ${
                            selectedFood?.food_id === food.food_id ? 'bg-zinc-900 border-l-2 border-neonLime' : ''
                          }`}
                        >
                          <div>
                            <span className="font-bold text-slate-200 text-sm">{food.name}</span>
                            <span className="text-[10px] text-zinc-500 ml-2">({food.serving_size}{food.serving_unit})</span>
                            {food.brand && <p className="text-[10px] text-zinc-500">{food.brand}</p>}
                          </div>
                          <span className="font-extrabold text-slate-400">{Math.round(food.calories)} kcal</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery && searchResults.length === 0 && (
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
