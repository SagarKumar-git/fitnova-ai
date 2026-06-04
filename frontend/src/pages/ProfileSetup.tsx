import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Activity, Compass, CheckCircle2, AlertCircle } from 'lucide-react';

export const ProfileSetup: React.FC = () => {
  const { user, profile, updateProfile, fetchProfile } = useAuth();
  const navigate = useNavigate();

  // Load profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Form states
  const [age, setAge] = useState<number>(profile?.age || 25);
  const [gender, setGender] = useState<string>(profile?.gender || 'male');
  const [height, setHeight] = useState<number>(profile?.height || 175);
  const [weight, setWeight] = useState<number>(profile?.weight || 70);
  const [targetWeight, setTargetWeight] = useState<number>(profile?.target_weight || 70);
  const [goal, setGoal] = useState<string>(profile?.goal || 'Maintenance');
  const [experienceLevel, setExperienceLevel] = useState<string>(profile?.experience_level || 'Beginner');
  const [activityLevel, setActivityLevel] = useState<string>(profile?.activity_level || 'Moderate');
  const [workoutDays, setWorkoutDays] = useState<number>(profile?.workout_days_per_week || 3);
  const [gymAccess, setGymAccess] = useState<boolean>(profile?.gym_access ?? true);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state if profile loads asynchronously
  useEffect(() => {
    if (profile) {
      setAge(profile.age);
      setGender(profile.gender);
      setHeight(profile.height);
      setWeight(profile.weight);
      setTargetWeight(profile.target_weight);
      setGoal(profile.goal);
      setExperienceLevel(profile.experience_level);
      setActivityLevel(profile.activity_level);
      setWorkoutDays(profile.workout_days_per_week);
      setGymAccess(profile.gym_access);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Basic range validation
    if (age <= 0 || age > 120) { setError("Age must be between 1 and 120."); return; }
    if (height < 50 || height > 250) { setError("Height must be between 50cm and 250cm."); return; }
    if (weight < 20 || weight > 400) { setError("Current Weight must be between 20kg and 400kg."); return; }
    if (targetWeight < 20 || targetWeight > 400) { setError("Target Weight must be between 20kg and 400kg."); return; }
    if (workoutDays < 1 || workoutDays > 7) { setError("Workout days per week must be between 1 and 7."); return; }

    setIsSubmitting(true);
    try {
      await updateProfile({
        age,
        gender,
        height,
        weight,
        target_weight: targetWeight,
        goal,
        experience_level: experienceLevel,
        activity_level: activityLevel,
        workout_days_per_week: workoutDays,
        gym_access: gymAccess,
        current_body_fat: profile?.current_body_fat || null,
        target_body_fat: profile?.target_body_fat || null,
        goal_deadline: profile?.goal_deadline || null
      });

      setSuccessMsg("Profile saved successfully!");
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = !!profile;

  const content = (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
          {isEdit ? "Update Your Profile" : "Complete Your Profile Setup"}
        </h1>
        <p className="text-zinc-400 mt-2">
          {isEdit 
            ? "Modify your baseline metrics and goals below to recalculate targets." 
            : "To help FitNova AI personalize your experience, please provide your body metrics."
          }
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/40 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-200">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Physical Metrics */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 mb-4">
            <Activity className="w-5 h-5 text-neonLime" />
            <h3 className="font-bold text-slate-200">Physical Metrics</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Age (years)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime appearance-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other / Custom</option>
              </select>
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
                required
              />
            </div>

            {/* Current Weight */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
                required
              />
            </div>

            {/* Target Weight */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Target Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Fitness Goals & Preferences */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 mb-4">
            <Compass className="w-5 h-5 text-neonCyan" />
            <h3 className="font-bold text-slate-200">Fitness & Nutrition Strategy</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Goal */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Primary Goal</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
              >
                <option value="Muscle Gain">Muscle Gain (Clean Bulking)</option>
                <option value="Fat Loss">Fat Loss (Cutting / Toning)</option>
                <option value="Maintenance">Maintenance (Body Recomposition)</option>
              </select>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
              >
                <option value="Beginner">Beginner (learning forms)</option>
                <option value="Intermediate">Intermediate (1-3 years training)</option>
                <option value="Advanced">Advanced (regular routine 3+ years)</option>
              </select>
            </div>

            {/* Activity Level */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Daily Activity Level</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
              >
                <option value="Sedentary">Sedentary (desk job, low exercise)</option>
                <option value="Light">Light (occasional walks, active daily chores)</option>
                <option value="Moderate">Moderate (structured workout 3-5 days/wk)</option>
                <option value="Active">Active (intense workouts 6-7 days/wk)</option>
                <option value="Very Active">Very Active (heavy physical job & training)</option>
              </select>
            </div>

            {/* Workout Days */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Workout Days Per Week</label>
              <input
                type="number"
                min="1"
                max="7"
                value={workoutDays}
                onChange={(e) => setWorkoutDays(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-750 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
                required
              />
            </div>

            {/* Gym Access */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Do you have gym access?</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setGymAccess(true)}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold border text-sm transition-all duration-200 ${
                    gymAccess 
                      ? 'bg-neonLime/10 border-neonLime text-neonLime' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Yes (Full Equipment)
                </button>
                <button
                  type="button"
                  onClick={() => setGymAccess(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold border text-sm transition-all duration-200 ${
                    !gymAccess 
                      ? 'bg-neonCyan/10 border-neonCyan text-neonCyan' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  No (Home / Calisthenics)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-gradient-to-r from-neonLime to-neonCyan text-black font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(163,230,53,0.25)] transition-all duration-200"
        >
          {isSubmitting ? "Saving Metrics..." : "Save Profile & Calculate Targets"}
        </button>
      </form>
    </div>
  );

  // Wrap in Layout if the user has completed profile setup (meaning the sidebar should show up)
  // If the user hasn't completed setup (first login), hide the sidebar to force setup
  if (isEdit || user?.has_profile) {
    return <Layout>{content}</Layout>;
  }

  return (
    <div className="min-h-screen bg-darkBg text-slate-100 p-8 flex items-center justify-center">
      <div className="w-full max-w-3xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-neonLime/5 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>
        {content}
      </div>
    </div>
  );
};
