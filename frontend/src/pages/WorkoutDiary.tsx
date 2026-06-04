import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { 
  Play, Plus, Check, Trash2, Clock, 
  Dumbbell, X, ChevronRight, Timer 
} from 'lucide-react';

interface ExerciseBrief {
  id: string;
  name: string;
  category: string;
  equipment: string;
  primary_muscle_group_name?: string;
}

interface WorkoutSet {
  id?: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number;
  rest_seconds?: number;
  is_logged: boolean;
  is_pr?: boolean;
}

interface ActiveSession {
  id: string;
  name: string;
  started_at: string;
  sets: any[];
}

interface RoutineTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: any[];
}

export const WorkoutDiary: React.FC = () => {
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [exercisesList, setExercisesList] = useState<ExerciseBrief[]>([]);
  const [loading, setLoading] = useState(true);

  // Active workout states
  const [sessionExercises, setSessionExercises] = useState<{ exercise: ExerciseBrief; sets: WorkoutSet[] }[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // Modals
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Rest Timer states
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const restTimerRef = useRef<any>(null);

  const fetchActiveSessionAndTemplates = async () => {
    setLoading(true);
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      // 1. Fetch active session
      const activeRes = await fetch('http://127.0.0.1:8000/api/workouts/sessions/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const activeData = await activeRes.json();
      
      // 2. Fetch routines templates
      const templatesRes = await fetch('http://127.0.0.1:8000/api/workouts/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }

      // 3. Fetch exercises database
      const exercisesRes = await fetch('http://127.0.0.1:8000/api/exercises', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (exercisesRes.ok) {
        const exercisesData = await exercisesRes.json();
        setExercisesList(exercisesData);
      }

      if (activeData) {
        setActiveSession(activeData);
        // Reconstruct local exercises lists from logged sets
        const groupedSets: Record<string, WorkoutSet[]> = {};
        activeData.sets.forEach((set: any) => {
          if (!groupedSets[set.exercise_id]) {
            groupedSets[set.exercise_id] = [];
          }
          groupedSets[set.exercise_id].push({
            id: set.id,
            exercise_id: set.exercise_id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe || undefined,
            rest_seconds: set.rest_seconds || 90,
            is_logged: true,
            is_pr: set.is_pr
          });
        });

        const reconstructed = Object.keys(groupedSets).map(exId => {
          const exInfo = exercisesList.find(e => e.id === exId) || {
            id: exId,
            name: activeData.sets.find((s: any) => s.exercise_id === exId)?.exercise_name || "Exercise",
            category: "Strength",
            equipment: ""
          };
          return {
            exercise: exInfo,
            sets: groupedSets[exId]
          };
        });
        setSessionExercises(reconstructed);

        // Start session elapsed timer
        const startMs = new Date(activeData.started_at).getTime();
        const diffSecs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setElapsedSeconds(diffSecs);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessionAndTemplates();
  }, []);

  // Update live timer
  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession]);

  // Handle rest timer countdown
  useEffect(() => {
    if (restRemaining !== null) {
      if (restRemaining > 0) {
        restTimerRef.current = setTimeout(() => {
          setRestRemaining(prev => (prev !== null ? prev - 1 : null));
        }, 1000);
      } else {
        setRestRemaining(null);
        // Play notification sound if supported
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.connect(gain);
          gain.connect(context.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, context.currentTime); // high beep
          gain.gain.setValueAtTime(0.1, context.currentTime);
          osc.start();
          osc.stop(context.currentTime + 0.15);
        } catch (e) {}
      }
    }
    return () => {
      if (restTimerRef.current) clearTimeout(restTimerRef.current);
    };
  }, [restRemaining]);

  const handleStartWorkout = async (name: string, templateId?: string) => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/api/workouts/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name,
          template_id: templateId || null
        })
      });

      if (response.ok) {
        const sessionData = await response.json();
        setActiveSession(sessionData);
        setSessionExercises([]);
        setSessionNotes('');
        setElapsedSeconds(0);

        // Prepopulate sets if template was selected
        if (templateId) {
          const selectedTemplate = templates.find(t => t.id === templateId);
          if (selectedTemplate) {
            const prepopulated = selectedTemplate.exercises.map(te => {
              const setsArray: WorkoutSet[] = [];
              for (let i = 1; i <= te.target_sets; i++) {
                setsArray.push({
                  exercise_id: te.exercise_id,
                  set_number: i,
                  weight: te.target_weight || 0,
                  reps: te.target_reps || 10,
                  rpe: undefined,
                  rest_seconds: te.rest_seconds || 90,
                  is_logged: false
                });
              }
              return {
                exercise: te.exercise || { id: te.exercise_id, name: "Exercise", category: "", equipment: "" },
                sets: setsArray
              };
            });
            setSessionExercises(prepopulated);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExerciseToSession = (ex: ExerciseBrief) => {
    // Check if exercise already in session
    if (sessionExercises.find(se => se.exercise.id === ex.id)) {
      setShowExerciseModal(false);
      return;
    }

    setSessionExercises(prev => [
      ...prev,
      {
        exercise: ex,
        sets: [
          {
            exercise_id: ex.id,
            set_number: 1,
            weight: 0,
            reps: 10,
            is_logged: false,
            rest_seconds: 90
          }
        ]
      }
    ]);
    setShowExerciseModal(false);
  };

  const handleAddSetToExercise = (exId: string) => {
    setSessionExercises(prev => {
      return prev.map(se => {
        if (se.exercise.id !== exId) return se;
        const lastSet = se.sets[se.sets.length - 1];
        const nextNum = se.sets.length + 1;
        const newSet: WorkoutSet = {
          exercise_id: exId,
          set_number: nextNum,
          weight: lastSet ? lastSet.weight : 0,
          reps: lastSet ? lastSet.reps : 10,
          rest_seconds: lastSet ? lastSet.rest_seconds : 90,
          is_logged: false
        };
        return {
          ...se,
          sets: [...se.sets, newSet]
        };
      });
    });
  };

  const handleUpdateLocalSet = (exId: string, setIndex: number, fields: Partial<WorkoutSet>) => {
    setSessionExercises(prev => {
      return prev.map(se => {
        if (se.exercise.id !== exId) return se;
        const newSets = [...se.sets];
        newSets[setIndex] = { ...newSets[setIndex], ...fields };
        return { ...se, sets: newSets };
      });
    });
  };

  const handleLogSet = async (exId: string, setIndex: number) => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    const se = sessionExercises.find(s => s.exercise.id === exId);
    if (!se) return;
    const targetSet = se.sets[setIndex];

    try {
      const response = await fetch('http://127.0.0.1:8000/api/workouts/sessions/log-set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exercise_id: exId,
          set_number: targetSet.set_number,
          reps: targetSet.reps,
          weight: targetSet.weight,
          rpe: targetSet.rpe || null,
          rest_seconds: targetSet.rest_seconds || 90
        })
      });

      if (response.ok) {
        const savedSet = await response.json();
        handleUpdateLocalSet(exId, setIndex, {
          id: savedSet.id,
          is_logged: true,
          is_pr: savedSet.is_pr
        });

        // Trigger rest timer
        if (targetSet.rest_seconds && targetSet.rest_seconds > 0) {
          setRestRemaining(targetSet.rest_seconds);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSet = async (exId: string, setIndex: number) => {
    const se = sessionExercises.find(s => s.exercise.id === exId);
    if (!se) return;
    const targetSet = se.sets[setIndex];

    if (targetSet.is_logged && targetSet.id) {
      const token = localStorage.getItem('fitnova_token');
      if (!token) return;

      try {
        await fetch(`http://127.0.0.1:8000/api/workouts/sessions/delete-set/${targetSet.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error(err);
      }
    }

    setSessionExercises(prev => {
      return prev.map(item => {
        if (item.exercise.id !== exId) return item;
        const filteredSets = item.sets.filter((_, idx) => idx !== setIndex).map((s, idx) => ({
          ...s,
          set_number: idx + 1
        }));
        return {
          ...item,
          sets: filteredSets
        };
      }).filter(item => item.sets.length > 0);
    });
  };

  const handleFinishWorkout = async () => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/api/workouts/sessions/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: sessionNotes || null
        })
      });

      if (response.ok) {
        setActiveSession(null);
        setSessionExercises([]);
        setRestRemaining(null);
        navigate('/workout-analytics');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredExercises = exercisesList.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.primary_muscle_group_name && e.primary_muscle_group_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Workout Diary</h1>
          <p className="text-zinc-400 mt-1">Design routines, log active training sessions, and track sets.</p>
        </div>
        {!activeSession && (
          <button 
            onClick={() => navigate('/workouts/templates')}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-slate-200 text-sm font-semibold tracking-wide transition-all"
          >
            Manage Routine Templates
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-neonLime"></div>
        </div>
      ) : !activeSession ? (
        /* Blank Slate: Select Routine or start empty */
        <div className="space-y-8">
          <div className="glass-panel p-8 rounded-2xl border border-zinc-800 max-w-xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 bg-neonLime/10 rounded-full flex items-center justify-center mx-auto text-neonLime neon-glow-lime">
              <Dumbbell className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Ready to train?</h2>
              <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">
                Log a quick empty workout or select one of your pre-configured routine templates below.
              </p>
            </div>
            
            <button 
              onClick={() => handleStartWorkout(`Quick Session - ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}`)}
              className="w-full py-3.5 bg-neonLime hover:bg-neonLime-dark text-black rounded-xl font-extrabold flex items-center justify-center gap-2 tracking-wide uppercase transition-all duration-200"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>Start Blank Workout</span>
            </button>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-200 mb-4">Select Routine Template</h3>
            {templates.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm space-y-4">
                <p>No routine templates configured yet.</p>
                <button 
                  onClick={() => navigate('/workouts/templates')}
                  className="px-4 py-2 bg-zinc-900 rounded-lg text-neonLime text-xs font-bold border border-zinc-800 hover:bg-zinc-800 transition"
                >
                  Create Your First Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(temp => (
                  <div key={temp.id} className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition">
                    <div>
                      <h4 className="font-extrabold text-slate-200 text-base">{temp.name}</h4>
                      <p className="text-zinc-500 text-xs mt-1 truncate">{temp.description || "No description"}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {temp.exercises.map(te => (
                          <span key={te.id} className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800/80 text-zinc-400">
                            {te.exercise?.name} ({te.target_sets} sets)
                          </span>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleStartWorkout(temp.name, temp.id)}
                      className="w-full mt-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-neonLime hover:text-black border border-zinc-800 text-neonLime text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Routine</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Active Logging Session Panel */
        <div className="space-y-6">
          {/* Active Status bar */}
          <div className="glass-panel p-4 rounded-2xl border border-neonLime/30 bg-neonLime/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-neonLime rounded-full animate-ping"></div>
              <div>
                <h3 className="font-black text-slate-100 text-sm">{activeSession.name}</h3>
                <span className="text-xs text-zinc-400 font-medium">Workout in progress...</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-zinc-300 font-mono text-lg font-bold">
                <Clock className="w-4 h-4 text-neonLime" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
              <button 
                onClick={handleFinishWorkout}
                className="px-6 py-2.5 bg-neonLime hover:bg-neonLime-dark text-black rounded-xl font-extrabold text-xs tracking-wider uppercase transition"
              >
                Finish Workout
              </button>
            </div>
          </div>

          {/* Session Notes */}
          <div className="glass-panel p-4 rounded-xl border border-zinc-800">
            <textarea
              placeholder="Add session notes (e.g. energy levels, goals for today)..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full bg-transparent border-none text-slate-300 text-sm focus:outline-none placeholder-zinc-600 resize-none h-12"
            />
          </div>

          {/* Exercises In Active Session */}
          <div className="space-y-6">
            {sessionExercises.map((se) => (
              <div key={se.exercise.id} className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-zinc-950/40">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                  <div>
                    <h4 className="font-extrabold text-slate-200 text-sm uppercase tracking-wide">{se.exercise.name}</h4>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5 block">
                      {se.exercise.primary_muscle_group_name || "Strength"} &bull; {se.exercise.equipment || "Free Weights"}
                    </span>
                  </div>
                </div>

                {/* Sets Logging Table */}
                <div className="space-y-3">
                  <div className="grid grid-cols-6 gap-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-2">
                    <span className="text-center">Set</span>
                    <span>Weight (kg)</span>
                    <span>Reps</span>
                    <span className="text-center">RPE</span>
                    <span className="text-center">Rest (s)</span>
                    <span className="text-center">Log Set</span>
                  </div>

                  {se.sets.map((set, setIdx) => (
                    <div 
                      key={setIdx} 
                      className={`grid grid-cols-6 gap-2 items-center px-2 py-1.5 rounded-lg border transition ${
                        set.is_logged 
                          ? 'bg-zinc-900/30 border-zinc-800/80' 
                          : 'bg-zinc-950 border-zinc-900'
                      }`}
                    >
                      <div className="text-center font-mono font-bold text-xs text-zinc-400">
                        {set.set_number}
                      </div>

                      <div>
                        <input
                          type="number"
                          value={set.weight || ''}
                          disabled={set.is_logged}
                          onChange={(e) => handleUpdateLocalSet(se.exercise.id, setIdx, { weight: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-zinc-900/70 border border-zinc-800 rounded px-2 py-1 text-slate-200 font-mono text-xs text-center focus:outline-none focus:border-neonLime"
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          value={set.reps || ''}
                          disabled={set.is_logged}
                          onChange={(e) => handleUpdateLocalSet(se.exercise.id, setIdx, { reps: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-900/70 border border-zinc-800 rounded px-2 py-1 text-slate-200 font-mono text-xs text-center focus:outline-none focus:border-neonLime"
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          value={set.rpe || ''}
                          disabled={set.is_logged}
                          placeholder="-"
                          onChange={(e) => handleUpdateLocalSet(se.exercise.id, setIdx, { rpe: parseFloat(e.target.value) || undefined })}
                          className="w-full bg-zinc-900/70 border border-zinc-800 rounded px-2 py-1 text-slate-200 font-mono text-xs text-center focus:outline-none focus:border-neonLime"
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          value={set.rest_seconds || ''}
                          disabled={set.is_logged}
                          placeholder="90"
                          onChange={(e) => handleUpdateLocalSet(se.exercise.id, setIdx, { rest_seconds: parseInt(e.target.value) || 90 })}
                          className="w-full bg-zinc-900/70 border border-zinc-800 rounded px-2 py-1 text-slate-200 font-mono text-xs text-center focus:outline-none focus:border-neonLime"
                        />
                      </div>

                      <div className="flex items-center justify-center gap-3">
                        {set.is_logged ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-neonLime/10 border border-neonLime/30 flex items-center justify-center text-neonLime">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                            {set.is_pr && (
                              <span className="text-[9px] font-black px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                                PR
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleLogSet(se.exercise.id, setIdx)}
                            className="w-7 h-7 rounded bg-neonLime/10 hover:bg-neonLime/20 border border-neonLime/30 hover:border-neonLime text-neonLime flex items-center justify-center transition"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                        )}

                        <button 
                          onClick={() => handleDeleteSet(se.exercise.id, setIdx)}
                          className="text-zinc-600 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleAddSetToExercise(se.exercise.id)}
                  className="mt-4 flex items-center gap-1 text-xs font-bold text-neonLime hover:text-neonLime-dark transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Set</span>
                </button>
              </div>
            ))}
          </div>

          {/* Bottom Add Exercise actions */}
          <button 
            onClick={() => { setShowExerciseModal(true); setSearchQuery(''); }}
            className="w-full py-4 border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/40 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 hover:text-slate-100 font-bold transition duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>Add Exercise to Workout</span>
          </button>
        </div>
      )}

      {/* Floating Rest Countdown Timer overlay */}
      {restRemaining !== null && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel p-4 rounded-2xl border border-neonLime bg-zinc-950/90 shadow-2xl flex items-center gap-4 animate-bounce">
          <div className="w-10 h-10 rounded-full border border-neonLime/30 bg-neonLime/10 flex items-center justify-center text-neonLime">
            <Timer className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Rest Timer Active</p>
            <p className="text-xl font-black font-mono text-slate-100 mt-0.5">{restRemaining}s</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setRestRemaining(prev => (prev !== null ? prev + 30 : 30))}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-slate-200 text-xs font-bold hover:bg-zinc-800 transition"
            >
              +30s
            </button>
            <button 
              onClick={() => setRestRemaining(null)}
              className="px-2.5 py-1.5 rounded-lg bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-bold hover:bg-red-900/30 transition"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Modal: Exercise Selector */}
      {showExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-zinc-850 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-lg font-black text-slate-100">Select Exercise</h3>
              <button 
                onClick={() => setShowExerciseModal(false)}
                className="text-zinc-500 hover:text-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input 
              type="text" 
              placeholder="Search exercise or muscle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
            />

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {filteredExercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => handleAddExerciseToSession(ex)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 transition text-left"
                >
                  <div>
                    <h5 className="font-extrabold text-slate-200 text-sm">{ex.name}</h5>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5 block">
                      {ex.primary_muscle_group_name || "Strength"} &bull; {ex.equipment || "Free weights"}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
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
