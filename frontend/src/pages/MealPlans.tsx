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
  AlertCircle 
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
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Apply template states
  const [applyDates, setApplyDates] = useState<Record<string, string>>({});

  // Creator states
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

  const fetchPlans = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

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
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTemplate = async (planId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/meal-plans/${planId}`, { method: 'DELETE' });
      if (response.status === 401 || response.status === 403) return;
      if (response.ok) fetchPlans();
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
      if (!response.ok) throw new Error("Failed to clone templates.");
      setSuccess(`Meal plan applied successfully to ${targetDate}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDateChange = (planId: string, val: string) => {
    setApplyDates({
      ...applyDates,
      [planId]: val
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-neonCyan border-t-transparent animate-spin"></div>
            <p className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Loading Templates</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Coffee className="text-neonCyan w-8 h-8" />
            Meal Templates Manager
          </h1>
          <p className="text-zinc-400 mt-1">Configure full template eating days and clone them instantly to your diary.</p>
        </div>
        
        <button
          onClick={() => setShowCreator(!showCreator)}
          className="py-2.5 px-5 bg-gradient-to-r from-neonCyan to-neonLime text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all duration-200"
        >
          {showCreator ? "Cancel Creator" : "Create New Template"}
        </button>
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

      {showCreator ? (
        // creator view
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
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Add Food to template</span>
              
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
                    className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-slate-100 placeholder-zinc-600 focus:outline-none focus:border-neonCyan"
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
                      className={`w-full p-2.5 text-left text-xs hover:bg-zinc-900 flex justify-between items-center ${
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
                      className="px-3 py-1 bg-neonCyan text-black font-extrabold rounded-lg text-[10px] uppercase"
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
              className="w-full py-3 bg-gradient-to-r from-neonCyan to-neonLime text-black font-bold uppercase rounded-xl text-xs tracking-wider"
            >
              Save Template Plan
            </button>
          </div>
        </div>
      ) : (
        // Saved templates list
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
                        className="text-zinc-600 hover:text-red-450 p-1 hover:bg-zinc-900 rounded"
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
                      className="w-1/3 py-2 bg-neonCyan hover:bg-neonCyan/80 text-black font-extrabold rounded-lg text-[10px] uppercase flex items-center justify-center gap-1 transition-colors"
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
    </Layout>
  );
};
