import { API_BASE_URL } from "../config";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { 
  Plus, Trash2, Dumbbell, X, Save, ArrowLeft, ArrowUp, ArrowDown 
} from 'lucide-react';

interface ExerciseBrief {
  id: string;
  name: string;
  category: string;
  equipment: string;
  primary_muscle_group_name?: string;
}

interface SelectedExercise {
  exercise_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  rest_seconds: number;
}

interface RoutineTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: {
    id: string;
    exercise_id: string;
    order: number;
    target_sets: number;
    target_reps: number;
    target_weight: number;
    rest_seconds: number;
    exercise: {
      name: string;
      primary_muscle_group_name?: string;
    };
  }[];
}

export const WorkoutTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [exercisesList, setExercisesList] = useState<ExerciseBrief[]>([]);
  const [loading, setLoading] = useState(true);

  // Creator state
  const [showCreator, setShowCreator] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [creatorError, setCreatorError] = useState<string | null>(null);

  // Search/Filter exercises in creator
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTemplatesAndExercises = async () => {
    setLoading(true);
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      const templatesRes = await fetch(`${API_BASE_URL}/workouts/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data);
      }

      const exercisesRes = await fetch(`${API_BASE_URL}/exercises`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (exercisesRes.ok) {
        const data = await exercisesRes.json();
        setExercisesList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplatesAndExercises();
  }, []);

  const handleAddExerciseToTemplate = (ex: ExerciseBrief) => {
    setSelectedExercises(prev => [
      ...prev,
      {
        exercise_id: ex.id,
        name: ex.name,
        target_sets: 3,
        target_reps: 10,
        target_weight: 0,
        rest_seconds: 90
      }
    ]);
    setShowExerciseSelector(false);
  };

  const handleRemoveExerciseFromTemplate = (idx: number) => {
    setSelectedExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateExerciseField = (idx: number, fields: Partial<SelectedExercise>) => {
    setSelectedExercises(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...fields };
      return updated;
    });
  };

  const handleMoveExercise = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === selectedExercises.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    setSelectedExercises(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[swapIdx];
      updated[swapIdx] = temp;
      return updated;
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorError(null);

    if (selectedExercises.length === 0) {
      setCreatorError("Please add at least one exercise to the routine template.");
      return;
    }

    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    // Map exercises to template structure
    const payload = {
      name,
      description: description || null,
      exercises: selectedExercises.map((se, idx) => ({
        exercise_id: se.exercise_id,
        order: idx + 1,
        target_sets: se.target_sets,
        target_reps: se.target_reps,
        target_weight: se.target_weight,
        rest_seconds: se.rest_seconds
      }))
    };

    try {
      const response = await fetch(`${API_BASE_URL}/workouts/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setName('');
        setDescription('');
        setSelectedExercises([]);
        setShowCreator(false);
        fetchTemplatesAndExercises();
      } else {
        const err = await response.json();
        setCreatorError(err.detail || "Failed to create template");
      }
    } catch (err: any) {
      setCreatorError("Connection error. Please try again.");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workout routine template?")) return;
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/workouts/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchTemplatesAndExercises();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredExercises = exercisesList.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.primary_muscle_group_name && e.primary_muscle_group_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <div className="flex items-center gap-4 mb-8">
        {showCreator && (
          <button 
            onClick={() => { setShowCreator(false); setCreatorError(null); }}
            className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {showCreator ? "Build Routine Template" : "Routine Templates"}
          </h1>
          <p className="text-zinc-400 mt-1">
            {showCreator 
              ? "Design workout plans, organize exercises, and set target volumes." 
              : "Pre-configure target loads and exercises for frictionless daily tracking."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-neonLime"></div>
        </div>
      ) : !showCreator ? (
        /* List templates */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-extrabold text-slate-200">Your Routines</h3>
            <button 
              onClick={() => setShowCreator(true)}
              className="px-5 py-2.5 bg-neonLime hover:bg-neonLime-dark text-black rounded-xl font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Template</span>
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-600">
                <Dumbbell className="w-6 h-6" />
              </div>
              <p className="text-sm">You haven't designed any workout routine templates yet.</p>
              <button 
                onClick={() => setShowCreator(true)}
                className="px-4 py-2 bg-neonLime hover:bg-neonLime-dark text-black text-xs font-bold rounded-lg transition"
              >
                Create Your First Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {templates.map(temp => (
                <div key={temp.id} className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-950/20 hover:border-zinc-700/60 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-100 text-base">{temp.name}</h4>
                        <p className="text-zinc-500 text-xs mt-1">{temp.description || "No description provided."}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteTemplate(temp.id)}
                        className="p-2 rounded bg-zinc-900 border border-zinc-850 hover:border-red-900/50 hover:bg-red-950/10 text-zinc-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-6 border-t border-zinc-900 pt-4 space-y-2.5">
                      {temp.exercises.map((te, idx) => (
                        <div key={te.id} className="flex items-center justify-between text-xs text-zinc-400">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-zinc-600 font-bold">{idx + 1}.</span>
                            <span className="font-semibold text-slate-200">{te.exercise?.name}</span>
                          </div>
                          <span className="text-zinc-500 font-medium">
                            {te.target_sets} sets &times; {te.target_reps || 10} reps &bull; {te.rest_seconds || 90}s rest
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-zinc-900 flex items-center justify-end">
                    <button 
                      onClick={() => navigate('/workouts')}
                      className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-slate-350 text-xs font-bold transition"
                    >
                      Use in Workout Diary
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Create Template Form */
        <form onSubmit={handleSaveTemplate} className="space-y-6 max-w-3xl">
          {creatorError && (
            <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
              <span className="font-bold">Error:</span>
              <p>{creatorError}</p>
            </div>
          )}

          <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wide text-zinc-450 mb-2">Routine Name</label>
              <input 
                type="text" 
                placeholder="e.g. Push Day A, Legs hypertrophy..."
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-neonLime"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wide text-zinc-450 mb-2">Description (Optional)</label>
              <textarea 
                placeholder="Describe focus, warm-up guides, or tips for this workout routine..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-neonLime h-20 resize-none"
              />
            </div>
          </div>

          {/* Exercises in template list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-base">Exercises ({selectedExercises.length})</h3>
              <button 
                type="button"
                onClick={() => { setShowExerciseSelector(true); setSearchQuery(''); }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-neonLime text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exercise</span>
              </button>
            </div>

            {selectedExercises.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-850 rounded-2xl p-8 text-center text-zinc-550 text-xs">
                No exercises added to this template yet. Tap "Add Exercise" to begin.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedExercises.map((se, idx) => (
                  <div key={idx} className="glass-panel p-4 rounded-xl border border-zinc-800 bg-zinc-950/20 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button 
                          type="button" 
                          onClick={() => handleMoveExercise(idx, 'up')}
                          disabled={idx === 0}
                          className="text-zinc-650 hover:text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleMoveExercise(idx, 'down')}
                          disabled={idx === selectedExercises.length - 1}
                          className="text-zinc-650 hover:text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-200 text-sm">{se.name}</h4>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">Position {idx + 1}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Sets */}
                      <div className="w-20">
                        <label className="block text-[9px] font-extrabold text-zinc-500 uppercase mb-1">Sets</label>
                        <input 
                          type="number" 
                          min="1"
                          value={se.target_sets}
                          onChange={(e) => handleUpdateExerciseField(idx, { target_sets: parseInt(e.target.value) || 1 })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-slate-200 text-xs font-mono text-center focus:outline-none focus:border-neonLime"
                        />
                      </div>

                      {/* Reps */}
                      <div className="w-20">
                        <label className="block text-[9px] font-extrabold text-zinc-500 uppercase mb-1">Reps</label>
                        <input 
                          type="number" 
                          min="1"
                          value={se.target_reps}
                          onChange={(e) => handleUpdateExerciseField(idx, { target_reps: parseInt(e.target.value) || 10 })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-slate-200 text-xs font-mono text-center focus:outline-none focus:border-neonLime"
                        />
                      </div>

                      {/* Weight */}
                      <div className="w-24">
                        <label className="block text-[9px] font-extrabold text-zinc-500 uppercase mb-1">Weight (kg)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={se.target_weight || ''}
                          placeholder="Auto"
                          onChange={(e) => handleUpdateExerciseField(idx, { target_weight: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-slate-200 text-xs font-mono text-center focus:outline-none focus:border-neonLime"
                        />
                      </div>

                      {/* Rest */}
                      <div className="w-24">
                        <label className="block text-[9px] font-extrabold text-zinc-500 uppercase mb-1">Rest (s)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={se.rest_seconds}
                          onChange={(e) => handleUpdateExerciseField(idx, { rest_seconds: parseInt(e.target.value) || 90 })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-slate-200 text-xs font-mono text-center focus:outline-none focus:border-neonLime"
                        />
                      </div>

                      <button 
                        type="button"
                        onClick={() => handleRemoveExerciseFromTemplate(idx)}
                        className="p-2 rounded bg-zinc-900 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => { setShowCreator(false); setCreatorError(null); }}
              className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-slate-350 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-neonLime hover:bg-neonLime-dark text-black rounded-xl font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Routine</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal: Exercise Selector */}
      {showExerciseSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-zinc-850 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-lg font-black text-slate-100">Select Exercise</h3>
              <button 
                type="button"
                onClick={() => setShowExerciseSelector(false)}
                className="text-zinc-500 hover:text-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input 
              type="text" 
              placeholder="Search exercise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-neonLime"
            />

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {filteredExercises.map(ex => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleAddExerciseToTemplate(ex)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 transition text-left"
                >
                  <div>
                    <h5 className="font-extrabold text-slate-200 text-sm">{ex.name}</h5>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5 block">
                      {ex.primary_muscle_group_name || "Strength"}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-neonLime" />
                </button>
              ))}
              {filteredExercises.length === 0 && (
                <p className="text-center text-zinc-650 text-xs py-8">No exercises found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
