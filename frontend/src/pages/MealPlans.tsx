import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { 
  Coffee, 
  Plus, 
  Trash2, 
  Play, 
  Search, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Cpu,
  ShoppingCart,
  RefreshCw,
  Clock,
  Utensils,
  Apple,
  RotateCcw,
  BookOpen
} from 'lucide-react';

interface Food {
  food_id: string;
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

interface MealPlanItem {
  item_id: string;
  meal_type: string;
  servings: number;
  food: Food;
}

interface MealPlan {
  meal_plan_id: string;
  name: string;
  created_at: string;
  items: MealPlanItem[];
}

export const MealPlans: React.FC = () => {
  const { apiFetch } = useAuth();
  
  // Navigation & tabs state
  const [activeTab, setActiveTab] = useState<'ai' | 'templates'>('ai');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // -------------------------------------------------------------
  // AI MEAL PLANNER STATES
  // -------------------------------------------------------------
  const [latestPlan, setLatestPlan] = useState<any>(null);
  const [historyPlans, setHistoryPlans] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);
  
  // Custom biometrics override states
  const [goalInput, setGoalInput] = useState('Fat Loss');
  const [weightInput, setWeightInput] = useState<number>(70);
  const [heightInput, setHeightInput] = useState<number>(170);
  const [ageInput, setAgeInput] = useState<number>(25);
  const [activityInput, setActivityInput] = useState('Moderate');
  const [dietTypeInput, setDietTypeInput] = useState('Vegetarian');
  const [cuisineInput, setCuisineInput] = useState('Indian Diet');

  // Grocery states
  const [groceryList, setGroceryList] = useState<Record<string, string[]> | null>(null);
  const [loadingGrocery, setLoadingGrocery] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // -------------------------------------------------------------
  // CUSTOM TEMPLATES STATES
  // -------------------------------------------------------------
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [applyDates, setApplyDates] = useState<Record<string, string>>({});
  const [showCreator, setShowCreator] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateItems, setTemplateItems] = useState<{ food_id: string; food_name: string; meal_type: string; servings: number; calories: number }[]>([]);
  
  // Search food in creator
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [servingsInput, setServingsInput] = useState<number>(1.0);
  const [mealTypeInput, setMealTypeInput] = useState('Breakfast');

  const mealTypes = ['Breakfast', 'Pre Workout', 'Post Workout', 'Lunch', 'Dinner', 'Snack'];

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchProfileBaselines = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/ai/profile`);
      if (response.ok) {
        const data = await response.json();
        setGoalInput(data.goal || 'Fat Loss');
        setWeightInput(data.weight || 70);
        setHeightInput(data.height || 170);
        setAgeInput(data.age || 25);
        setActivityInput(data.activity_level || 'Moderate');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to load baselines:", err);
    }
  };

  const fetchLatestAIPlan = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/ai/meal`);
      if (response.ok) {
        const data = await response.json();
        setLatestPlan(data);
        fetchGroceryList(data.id);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to load latest AI plan:", err);
    }
  };

  const fetchAIHistory = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/ai/meal/history`);
      if (response.ok) {
        const data = await response.json();
        setHistoryPlans(data);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to load AI history:", err);
    }
  };

  const fetchCustomTemplates = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/meal-plans`);
      if (response.status === 401 || response.status === 403) return;
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
        const todayStr = new Date().toLocaleDateString('sv');
        const datesMap = data.reduce((acc: Record<string, string>, plan: MealPlan) => {
          acc[plan.meal_plan_id] = todayStr;
          return acc;
        }, {});
        setApplyDates(datesMap);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to load templates:", err);
    }
  };

  const fetchGroceryList = async (planId: string) => {
    setLoadingGrocery(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/ai/meal/${planId}/grocery`);
      if (response.ok) {
        const data = await response.json();
        setGroceryList(data);
        setCheckedItems({});
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to load grocery list:", err);
    } finally {
      setLoadingGrocery(false);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProfileBaselines(),
      fetchLatestAIPlan(),
      fetchAIHistory(),
      fetchCustomTemplates()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  // Food search debounce for manual template creator
  useEffect(() => {
    const searchDebounce = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([]);
        return;
      }
      try {
        const response = await apiFetch(`${API_BASE_URL}/foods?query=${searchQuery}`);
        if (response.status === 401 || response.status === 403) return;
        if (response.ok) {
          const result = await response.json();
          setSearchResults(result);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Search error in plans:", err);
      }
    }, 250);

    return () => clearTimeout(searchDebounce);
  }, [searchQuery]);

  // -------------------------------------------------------------
  // ACTIONS & HANDLERS
  // -------------------------------------------------------------
  const handleGenerateAIPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/ai/meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diet_type: dietTypeInput,
          diet_cuisine: cuisineInput,
          goal: goalInput,
          weight: weightInput,
          height: heightInput,
          age: ageInput,
          activity_level: activityInput
        })
      });

      if (response.status === 401 || response.status === 403) return;
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to generate AI meal plan.");
      }

      const data = await response.json();
      setLatestPlan(data);
      setSuccess("New AI Meal Plan generated successfully!");
      fetchAIHistory();
      fetchGroceryList(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSwapMeal = async (mealType: string) => {
    if (!latestPlan) return;
    setSwappingMeal(mealType);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/ai/meal/${latestPlan.id}/swap?meal_type=${mealType}`,
        { method: 'POST' }
      );
      if (response.status === 401 || response.status === 403) return;
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to replace meal.");
      }
      const updatedPlan = await response.json();
      setLatestPlan(updatedPlan);
      setSuccess(`Meal '${mealType}' replaced successfully!`);
      // Update history in-place
      setHistoryPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
      fetchGroceryList(updatedPlan.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSwappingMeal(null);
    }
  };

  const handleDeleteAIPlan = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    setError(null);
    setSuccess(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/ai/meal/${planId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSuccess("AI Meal Plan deleted successfully.");
        fetchAIHistory();
        if (latestPlan?.id === planId) {
          setLatestPlan(null);
          setGroceryList(null);
        }
      }
    } catch (err) {
      setError("Failed to delete AI meal plan.");
    }
  };

  const handleSelectHistoryPlan = (plan: any) => {
    setLatestPlan(plan);
    setSuccess(null);
    setError(null);
    fetchGroceryList(plan.id);
  };

  const handleGroceryCheckToggle = (item: string) => {
    setCheckedItems({
      ...checkedItems,
      [item]: !checkedItems[item]
    });
  };

  const handleDateChange = (planId: string, val: string) => {
    setApplyDates(prev => ({
      ...prev,
      [planId]: val
    }));
  };

  // Helper macro sums
  const getPlanTotals = (plan: any): { cal: number; pro: number; carb: number; fat: number } => {
    const result = { cal: 0, pro: 0, carb: 0, fat: 0 };
    if (!plan || !plan.meals_data) return result;
    Object.values(plan.meals_data).forEach((meal: any) => {
      result.cal += meal.calories || 0;
      result.pro += meal.protein || 0;
      result.carb += meal.carbohydrates || 0;
      result.fat += meal.fat || 0;
    });
    return result;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // -------------------------------------------------------------
  // CUSTOM TEMPLATES LOGIC
  // -------------------------------------------------------------
  const handleAddTempItem = () => {
    if (!selectedFood) return;
    setTemplateItems([
      ...templateItems,
      {
        food_id: selectedFood.food_id,
        food_name: selectedFood.name,
        meal_type: mealTypeInput,
        servings: servingsInput,
        calories: selectedFood.calories * servingsInput
      }
    ]);
    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    setServingsInput(1.0);
  };

  const handleRemoveTempItem = (index: number) => {
    const updated = [...templateItems];
    updated.splice(index, 1);
    setTemplateItems(updated);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!templateName.trim()) {
      setError("Please provide a template name.");
      return;
    }
    if (templateItems.length === 0) {
      setError("Add at least one food item to the template.");
      return;
    }

    try {
      const response = await apiFetch(`${API_BASE_URL}/meal-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          items: templateItems.map(item => ({
            food_id: item.food_id,
            meal_type: item.meal_type,
            servings: item.servings
          }))
        })
      });

      if (response.status === 401 || response.status === 403) return;
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to create template.");
      }

      setSuccess("Meal Template saved successfully!");
      setTemplateName('');
      setTemplateItems([]);
      setShowCreator(false);
      fetchCustomTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTemplate = async (planId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/meal-plans/${planId}`, { method: 'DELETE' });
      if (response.status === 401 || response.status === 403) return;
      if (response.ok) fetchCustomTemplates();
    } catch (err) {
      if (import.meta.env.DEV) console.error("Delete template failed:", err);
    }
  };

  const handleApplyTemplate = async (planId: string) => {
    setError(null);
    setSuccess(null);
    const targetDate = applyDates[planId];
    if (!targetDate) return;

    try {
      const response = await apiFetch(
        `${API_BASE_URL}/meal-plans/${planId}/apply?logged_date=${targetDate}`,
        { method: 'POST' }
      );
      if (response.status === 401 || response.status === 403) return;
      if (!response.ok) throw new Error("Failed to log template.");
      setSuccess(`Meal plan applied successfully to ${targetDate}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-neonCyan border-t-transparent animate-spin"></div>
            <p className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Loading Planner</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totals = getPlanTotals(latestPlan);

  return (
    <Layout>
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Coffee className="text-neonCyan w-8 h-8" />
            Diet & Meal Plans
          </h1>
          <p className="text-zinc-400 mt-1">Generate dynamic AI target-based plans or configure custom meal templates.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-900 mb-6">
        <button
          onClick={() => setActiveTab('ai')}
          className={`py-3 px-6 font-bold text-sm tracking-wider uppercase border-b-2 transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'ai' 
              ? 'border-neonCyan text-neonCyan' 
              : 'border-transparent text-zinc-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-neonCyan" />
          AI Meal Planner
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 px-6 font-bold text-sm tracking-wider uppercase border-b-2 transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'templates' 
              ? 'border-neonCyan text-neonCyan' 
              : 'border-transparent text-zinc-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-neonLime" />
          Custom Templates
        </button>
      </div>

      {/* Messages */}
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

      {/* TAB 1: AI MEAL PLANNER */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form & History */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Form */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-zinc-900">
                <Cpu className="text-neonCyan w-5 h-5" />
                Customize Plan Parameters
              </h2>
              
              <form onSubmit={handleGenerateAIPlan} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-1">Goal</label>
                    <select
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-neonCyan"
                    >
                      <option value="Fat Loss">Fat Loss (Cut)</option>
                      <option value="Muscle Gain">Muscle Gain (Bulk)</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-1">Activity Level</label>
                    <select
                      value={activityInput}
                      onChange={(e) => setActivityInput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-neonCyan"
                    >
                      <option value="Sedentary">Sedentary</option>
                      <option value="Light">Lightly Active</option>
                      <option value="Moderate">Moderately Active</option>
                      <option value="Active">Very Active</option>
                      <option value="Very Active">Extremely Active</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightInput}
                      onChange={(e) => setWeightInput(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-neonCyan text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={heightInput}
                      onChange={(e) => setHeightInput(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-neonCyan text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-1">Age (yrs)</label>
                    <input
                      type="number"
                      value={ageInput}
                      onChange={(e) => setAgeInput(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-neonCyan text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-1">Diet Preference</label>
                    <select
                      value={dietTypeInput}
                      onChange={(e) => setDietTypeInput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-neonCyan"
                    >
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Non Vegetarian">Non-Vegetarian</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-1">Cuisine Style</label>
                    <select
                      value={cuisineInput}
                      onChange={(e) => setCuisineInput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-neonCyan"
                    >
                      <option value="Indian Diet">Indian Cuisine</option>
                      <option value="Global">Global / Western</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-3 bg-gradient-to-r from-neonCyan to-neonLime text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate New Plan
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* History */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-zinc-900">
                <Clock className="text-neonLime w-5 h-5" />
                Plan History
              </h2>

              {historyPlans.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No generated meal plans found.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto custom-sidebar-scrollbar pr-1">
                  {historyPlans.map((hPlan) => (
                    <div
                      key={hPlan.id}
                      onClick={() => handleSelectHistoryPlan(hPlan)}
                      className={`p-3 bg-zinc-950 border rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 ${
                        latestPlan?.id === hPlan.id 
                          ? 'border-neonCyan/60 bg-neonCyan/5' 
                          : 'border-zinc-900 hover:border-zinc-800'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="text-[11px] font-bold text-slate-200 block truncate">
                          {hPlan.diet_type} • {hPlan.diet_cuisine}
                        </span>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">
                          {formatDate(hPlan.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-extrabold text-neonCyan">{Math.round(hPlan.calories)} kcal</span>
                        <button
                          onClick={(e) => handleDeleteAIPlan(e, hPlan.id)}
                          className="p-1 text-zinc-600 hover:text-red-400 rounded hover:bg-zinc-900 transition-colors"
                          aria-label="Delete plan from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Active Plan Details */}
          <div className="lg:col-span-7 space-y-6">
            {latestPlan ? (
              <>
                {/* Active Plan Header */}
                <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <span className="px-3 py-1 bg-neonCyan/15 text-neonCyan text-[10px] font-bold uppercase tracking-wider rounded-full border border-neonCyan/30">
                      {latestPlan.diet_type}
                    </span>
                    <span className="px-3 py-1 bg-neonLime/15 text-neonLime text-[10px] font-bold uppercase tracking-wider rounded-full border border-neonLime/30">
                      {latestPlan.diet_cuisine}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider ml-auto">
                      Generated: {new Date(latestPlan.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-100 mt-2">Active AI Meal Recommendations</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Based on targets for **{latestPlan.goal || 'Fat Loss'}** ({latestPlan.weight || 70} kg, {latestPlan.height || 170} cm, {latestPlan.age || 25} yrs, {latestPlan.activity_level || 'Moderate'} activity).
                  </p>
                </div>

                {/* Daily Targets Panel */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-panel p-4 rounded-xl border border-zinc-800 text-center">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Calories</span>
                    <span className="text-lg font-black text-neonCyan block mt-1">{Math.round(latestPlan.calories)}</span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">Actual: {Math.round(totals.cal)} kcal</span>
                  </div>

                  <div className="glass-panel p-4 rounded-xl border border-zinc-800 text-center">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Protein</span>
                    <span className="text-lg font-black text-neonLime block mt-1">{Math.round(latestPlan.protein)}g</span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">Actual: {Math.round(totals.pro)}g</span>
                  </div>

                  <div className="glass-panel p-4 rounded-xl border border-zinc-800 text-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Carbs</span>
                    <span className="text-lg font-black text-slate-200 block mt-1">{Math.round(latestPlan.carbohydrates)}g</span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">Actual: {Math.round(totals.carb)}g</span>
                  </div>

                  <div className="glass-panel p-4 rounded-xl border border-zinc-800 text-center">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Fat</span>
                    <span className="text-lg font-black text-amber-500 block mt-1">{Math.round(latestPlan.fat)}g</span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">Actual: {Math.round(totals.fat)}g</span>
                  </div>
                </div>

                {/* Meals */}
                <div className="space-y-4">
                  {Object.entries(latestPlan.meals_data).map(([mealType, meal]: [string, any]) => {
                    const isSwapping = swappingMeal === mealType;
                    
                    return (
                      <div 
                        key={mealType}
                        className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 text-neonCyan">
                            {mealType === 'Breakfast' ? <Coffee className="w-5 h-5" /> : 
                             mealType === 'Snack' ? <Apple className="w-5 h-5" /> : 
                             <Utensils className="w-5 h-5" />}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase block">{mealType}</span>
                            <h3 className="text-sm font-extrabold text-slate-100 mt-0.5">{meal.name}</h3>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-zinc-400 font-semibold">
                              <span>Cal: <strong className="text-neonCyan">{Math.round(meal.calories)}</strong></span>
                              <span>P: <strong className="text-neonLime">{Math.round(meal.protein)}g</strong></span>
                              <span>C: <strong className="text-slate-300">{Math.round(meal.carbohydrates)}g</strong></span>
                              <span>F: <strong className="text-amber-500">{Math.round(meal.fat)}g</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end shrink-0">
                          <button
                            onClick={() => handleSwapMeal(mealType)}
                            disabled={isSwapping || generating}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-slate-100 uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {isSwapping ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-neonCyan" />
                                <span>Swapping...</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Replace Meal</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Grocery Shopping List */}
                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-zinc-900">
                    <ShoppingCart className="text-neonCyan w-5 h-5" />
                    Grocery Shopping List
                  </h2>

                  {loadingGrocery ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-neonCyan" />
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Parsing Ingredients...</span>
                    </div>
                  ) : groceryList ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {Object.entries(groceryList).map(([category, items]) => (
                        <div key={category} className="space-y-3">
                          <span className="text-[11px] font-bold text-neonLime uppercase tracking-wider block border-l-2 border-neonLime pl-2">
                            {category}
                          </span>
                          
                          <div className="space-y-2">
                            {items.map((item, idx) => {
                              const isChecked = checkedItems[item] || false;
                              return (
                                <label 
                                  key={idx}
                                  className={`flex items-center gap-3 px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs cursor-pointer select-none transition-colors ${
                                    isChecked ? 'border-neonCyan/20 opacity-55' : 'hover:border-zinc-800'
                                  }`}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleGroceryCheckToggle(item)}
                                    className="rounded border-zinc-800 text-neonCyan focus:ring-0 cursor-pointer"
                                  />
                                  <span className={`text-zinc-300 font-medium ${isChecked ? 'line-through text-zinc-500' : ''}`}>
                                    {item}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">Failed to load ingredients list.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="glass-panel p-16 rounded-2xl border border-zinc-800 text-center flex flex-col items-center justify-center gap-4 min-h-[300px]">
                <Cpu className="w-12 h-12 text-zinc-600 animate-pulse" />
                <h3 className="font-extrabold text-slate-300 text-base">No active plan generated</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Adjust the biometric baseline metrics on the left panel, and click **Generate New Plan** to generate macro-targeted diet plans using Gemini AI.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: CUSTOM MEAL TEMPLATES */}
      {activeTab === 'templates' && (
        <>
          {/* Action Header */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowCreator(!showCreator)}
              className="py-2 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-slate-100 font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
            >
              {showCreator ? "Back to Templates List" : "Create New Template"}
            </button>
          </div>

          {showCreator ? (
            /* Creator view */
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-6 max-w-3xl mx-auto">
              <h2 className="text-lg font-bold text-slate-100 pb-3 border-b border-zinc-900 flex items-center gap-2">
                <Plus className="text-neonCyan w-5 h-5" />
                Build Template Plan
              </h2>
              
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 tracking-wider uppercase mb-1.5">Template Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Clean Bulking Workday"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-900 rounded-xl text-slate-100 focus:outline-none focus:border-neonCyan"
                    required
                  />
                </div>

                {/* Food Search panel */}
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-bold">Add Food to template</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-600">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Roti, Dal, Paneer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-slate-100 placeholder-zinc-650 focus:outline-none focus:border-neonCyan"
                      />
                    </div>

                    <select
                      value={mealTypeInput}
                      onChange={(e) => setMealTypeInput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                    >
                      {mealTypes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Search dropdown */}
                  {searchResults.length > 0 && (
                    <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden max-h-40 overflow-y-auto">
                      {searchResults.map((food) => (
                        <button
                          key={food.food_id}
                          onClick={() => setSelectedFood(food)}
                          className={`w-full p-2.5 text-left text-xs hover:bg-zinc-900 flex justify-between items-center cursor-pointer ${
                            selectedFood?.food_id === food.food_id ? 'bg-zinc-900 text-neonCyan border-l-2 border-neonCyan' : 'text-zinc-300'
                          }`}
                        >
                          <span>{food.name} <span className="text-[10px] text-zinc-500">({food.serving_size}{food.serving_unit})</span></span>
                          <span>{Math.round(food.calories)} kcal</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedFood && (
                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-850/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-200">{selectedFood.name}</span>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{selectedFood.calories} kcal per serving</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          step="0.1"
                          value={servingsInput}
                          onChange={(e) => setServingsInput(parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-center text-slate-100"
                        />
                        <button
                          onClick={handleAddTempItem}
                          className="px-3 py-1 bg-neonCyan text-black font-extrabold rounded-lg text-[10px] uppercase cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Template items logging */}
                {templateItems.length > 0 && (
                  <div className="border border-zinc-900 rounded-xl overflow-hidden divide-y divide-zinc-900 bg-zinc-950">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block p-3 bg-zinc-900/40">Template Items ({templateItems.length})</span>
                    {templateItems.map((item, idx) => (
                      <div key={idx} className="p-3 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-200">{item.food_name}</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{item.meal_type} • {item.servings} serving(s)</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-slate-400">{Math.round(item.calories)} kcal</span>
                          <button 
                            onClick={() => handleRemoveTempItem(idx)}
                            className="text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleCreateTemplate}
                  className="w-full py-3 bg-gradient-to-r from-neonCyan to-neonLime text-black font-bold uppercase rounded-xl text-xs tracking-wider cursor-pointer"
                >
                  Save Template Plan
                </button>
              </div>
            </div>
          ) : (
            /* Saved templates list */
            plans.length === 0 ? (
              <div className="glass-panel p-12 rounded-2xl border border-zinc-800 text-center max-w-xl mx-auto mt-12">
                <Coffee className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                <h3 className="font-bold text-slate-200">No saved templates</h3>
                <p className="text-sm text-zinc-500 mt-2">Create custom meal plans to quickly log recurring eating schedules.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  // Calculate template totals
                  const planTotals = plan.items.reduce(
                    (sum, item) => {
                      const mult = item.servings;
                      sum.cal += item.food.calories * mult;
                      sum.pro += item.food.protein * mult;
                      return sum;
                    },
                    { cal: 0, pro: 0 }
                  );

                  return (
                    <div key={plan.meal_plan_id} className="glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-300">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-slate-100 text-base">{plan.name}</h3>
                          <button
                            onClick={() => handleDeleteTemplate(plan.meal_plan_id)}
                            className="text-zinc-600 hover:text-red-400 p-1 hover:bg-zinc-900 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-2 border-b border-zinc-900 pb-4 mb-4">
                          <div className="flex justify-between text-xs text-zinc-400">
                            <span>Seeded Foods:</span>
                            <span className="font-bold text-slate-300">{plan.items.length} items</span>
                          </div>
                          <div className="flex justify-between text-xs text-zinc-400">
                            <span>Total Calories:</span>
                            <span className="font-extrabold text-neonCyan">{Math.round(planTotals.cal)} kcal</span>
                          </div>
                          <div className="flex justify-between text-xs text-zinc-400">
                            <span>Total Protein:</span>
                            <span className="font-bold text-neonLime">{Math.round(planTotals.pro)}g</span>
                          </div>
                        </div>

                        {/* Collapsed items breakdown */}
                        <div className="max-h-24 overflow-y-auto mb-6 text-[11px] text-zinc-500 space-y-1">
                          {plan.items.map(item => (
                            <div key={item.item_id} className="flex justify-between">
                              <span>{item.food.name} ({item.meal_type})</span>
                              <span>{item.servings}x</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Apply triggers block */}
                      <div className="pt-4 border-t border-zinc-900 flex gap-2">
                        <input 
                          type="date"
                          value={applyDates[plan.meal_plan_id] || ''}
                          onChange={(e) => handleDateChange(plan.meal_plan_id, e.target.value)}
                          className="w-2/3 px-2.5 py-2 bg-zinc-950 border border-zinc-900 focus:outline-none text-[11px] font-semibold text-slate-300 rounded-lg select-none"
                        />
                        <button
                          onClick={() => handleApplyTemplate(plan.meal_plan_id)}
                          className="w-1/3 py-2 bg-neonCyan hover:bg-neonCyan/80 text-black font-extrabold rounded-lg text-[10px] uppercase flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-black" />
                          <span>Log</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </Layout>
  );
};
