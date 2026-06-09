import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Dumbbell, 
  Apple, 
  Sparkles, 
  Activity, 
  Award, 
  CheckCircle2, 
  ChevronDown, 
  Star, 
  ArrowRight, 
  Lock, 
  Code, 
  Heart, 
  ShieldCheck, 
  Flame, 
  Tv 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Interactive FAQ State
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  // Screenshots Switcher State
  const [activeScreenshot, setActiveScreenshot] = useState<'dashboard' | 'scanner' | 'coach'>('dashboard');

  const toggleFaq = (idx: number) => {
    setOpenFaqIdx(prev => prev === idx ? null : idx);
  };

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleExplore = () => {
    const section = document.getElementById('screenshots-browser');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      question: "What is FitNova AI?",
      answer: "FitNova AI is an all-in-one health and wellness platform that combines artificial intelligence, instant food scanning, and workout tracking to design custom, adaptive structures for your daily life."
    },
    {
      question: "Is it free?",
      answer: "Yes! FitNova AI offers a fully featured free tier that includes nutrition logging, water logging, workout diaries, and access to basic AI insights. No credit card is required to sign up."
    },
    {
      question: "How does the AI Coach work?",
      answer: "The AI Coach analyzes your age, height, weight, activity level, and equipment availability (gym vs. home) to generate customized workout programs and meal templates. It refines its recommendations as you log more workouts."
    },
    {
      question: "Is my personal data secure?",
      answer: "Absolutely. FitNova AI secures all session data with state-of-the-art encryption. Your profile metrics, training history, and uploaded meal pictures are stored privately and never shared."
    }
  ];

  const screenshots = {
    dashboard: {
      title: "Interactive AI Dashboard",
      description: "Get a high-level summary of your daily calorie balance, macro breakdown, water intake, and active training streaks in a single screen.",
      image: "/dashboard_mockup.png"
    },
    scanner: {
      title: "Food AI Computer Vision Scanner",
      description: "Snap or upload a photo of your meals. Our advanced computer vision model instantly identifies ingredients, portions, and estimates calories and macros.",
      image: "/food_scanner_mockup.png"
    },
    coach: {
      title: "Bespoke AI Training Coach",
      description: "Interact with an AI assistant that builds weekly workout structures, schedules meal templates, and provides adaptive adjustments based on your progress.",
      image: "/ai_coach_mockup.png"
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-slate-100 font-sans relative selection:bg-neonLime selection:text-black">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neonLime/5 rounded-full blur-[120px] pointer-events-none pulse-glow-bg z-0"></div>
      <div className="absolute top-[800px] left-0 w-[400px] h-[400px] bg-neonCyan/5 rounded-full blur-[100px] pointer-events-none pulse-glow-bg z-0"></div>

      {/* Header/Navigation */}
      <header className="border-b border-zinc-900 bg-darkBg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-neonLime to-neonCyan flex items-center justify-center shadow-lg">
              <Dumbbell className="w-4.5 h-4.5 text-black" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white font-outfit">
              FitNova<span className="text-neonLime">.AI</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <a href="#features" className="hover:text-neonLime transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-neonLime transition-colors">How It Works</a>
            <a href="#benefits" className="hover:text-neonLime transition-colors">Benefits</a>
            <a href="#faq" className="hover:text-neonLime transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={handleCTA}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-extrabold uppercase tracking-wider text-neonLime hover:bg-neonLime hover:text-black hover:border-neonLime transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(163,230,53,0.03)]"
            >
              {isAuthenticated ? "Dashboard" : "Get Started"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-20 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-full px-4 py-1.5 animate-fade-in shadow-md">
              <Sparkles className="w-4 h-4 text-neonLime animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                FitNova AI v1.0 Production Platform Live
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl lg:text-7.5xl font-black tracking-tight text-white font-outfit leading-[1.08] lg:leading-[1.05]">
              Your Personal <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonLime via-neonLime to-neonCyan drop-shadow-sm">
                AI Fitness Coach
              </span>
            </h1>
            
            <p className="text-zinc-400 text-base sm:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
              Scan food instantly via computer vision, build adaptive workout routines, and track milestones with the help of a dedicated AI health advisor.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={handleCTA}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-neonLime to-neonCyan text-black font-extrabold uppercase tracking-wider shadow-lg hover:shadow-[0_0_25px_rgba(163,230,53,0.25)] hover:scale-[1.01] transition-all duration-200 cursor-pointer text-sm"
              >
                {isAuthenticated ? "Enter Dashboard" : "Get Started Free"}
              </button>
              <button 
                onClick={handleExplore}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 hover:bg-zinc-900 text-sm font-extrabold uppercase tracking-wider transition-all cursor-pointer"
              >
                Explore Features
              </button>
            </div>
          </div>

          {/* Hero Hero Image mock */}
          <div className="mt-16 max-w-5xl mx-auto relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-neonLime to-neonCyan rounded-2xl blur opacity-10 group-hover:opacity-15 transition duration-500"></div>
            <div className="glass-panel p-2 rounded-2xl border border-zinc-850 overflow-hidden shadow-2xl bg-zinc-950/20">
              <img 
                src="/dashboard_mockup.png" 
                alt="FitNova AI Premium Dashboard Mockup" 
                className="w-full h-auto rounded-xl border border-zinc-900 object-cover" 
                loading="eager"
              />
            </div>
          </div>
        </section>

        {/* TRUST METRICS SECTION */}
        <section className="border-y border-zinc-900 bg-zinc-950/30 py-12">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4.5xl font-black text-white font-outfit">120K+</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Workouts Generated</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4.5xl font-black text-neonLime font-outfit">99.2%</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Scan Recognition Rate</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4.5xl font-black text-white font-outfit">10M+</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Calories Analyzed</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4.5xl font-black text-neonCyan font-outfit">4.9/5</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">User Rating Average</div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20 sm:py-28 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-neonLime">Simple Workflow</h2>
            <h3 className="text-3xl sm:text-4.5xl font-black text-white tracking-tight font-outfit">
              How FitNova AI Works
            </h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              No complex macros or rigid setups. Log, adapt, and succeed in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="glass-panel p-8 rounded-2xl border border-zinc-850 space-y-4 hover:border-zinc-800 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-neonLime/10 border border-neonLime/20 flex items-center justify-center">
                <Apple className="w-6 h-6 text-neonLime" />
              </div>
              <div className="text-xs font-bold text-neonLime">STEP 01</div>
              <h4 className="text-lg font-black text-white font-outfit">Snap & Record</h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Take a quick photo of your meals or log workouts in a few clicks. The platform aggregates metrics seamlessly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-panel p-8 rounded-2xl border border-zinc-850 space-y-4 hover:border-zinc-800 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-neonCyan/10 border border-neonCyan/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-neonCyan" />
              </div>
              <div className="text-xs font-bold text-neonCyan">STEP 02</div>
              <h4 className="text-lg font-black text-white font-outfit">Process & Analyze</h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Our vision models map macro ratios and track sets. We compare current stats against targets automatically.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-panel p-8 rounded-2xl border border-zinc-850 space-y-4 hover:border-zinc-800 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-xs font-bold text-purple-400">STEP 03</div>
              <h4 className="text-lg font-black text-white font-outfit">Refine & Train</h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Unlock achievements and consult your AI Coach to adapt routines, break plateaus, and maintain streaks.
              </p>
            </div>
          </div>
        </section>

        {/* SCREENSHOTS BROWSER SECTION */}
        <section id="screenshots-browser" className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900/60">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
            
            {/* Left switcher controls */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-neonLime">Interface Preview</h2>
                <h3 className="text-3xl sm:text-4.5xl font-black text-white tracking-tight font-outfit leading-tight">
                  Premium Experience, Appended Locally
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Interactive dashboards, computer vision trackers, and chat environments built entirely for modern web architectures.
                </p>
              </div>

              <div className="space-y-3">
                {/* Control 1 */}
                <button 
                  onClick={() => setActiveScreenshot('dashboard')}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
                    activeScreenshot === 'dashboard'
                      ? 'bg-zinc-900 border-zinc-800 text-white shadow-md'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeScreenshot === 'dashboard' ? 'bg-neonLime/10 text-neonLime' : 'bg-zinc-950/80 text-zinc-650'}`}>
                    <Tv className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">Dashboard Overview</h4>
                    <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">Aggregated metrics & goals</span>
                  </div>
                </button>

                {/* Control 2 */}
                <button 
                  onClick={() => setActiveScreenshot('scanner')}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
                    activeScreenshot === 'scanner'
                      ? 'bg-zinc-900 border-zinc-800 text-white shadow-md'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeScreenshot === 'scanner' ? 'bg-neonLime/10 text-neonLime' : 'bg-zinc-950/80 text-zinc-650'}`}>
                    <Apple className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">Food AI Scanner</h4>
                    <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">Photo scanning & macros</span>
                  </div>
                </button>

                {/* Control 3 */}
                <button 
                  onClick={() => setActiveScreenshot('coach')}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
                    activeScreenshot === 'coach'
                      ? 'bg-zinc-900 border-zinc-800 text-white shadow-md'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeScreenshot === 'coach' ? 'bg-neonLime/10 text-neonLime' : 'bg-zinc-950/80 text-zinc-650'}`}>
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">AI Coach Conversations</h4>
                    <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">Adaptive plans & chat advice</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Right mockup window */}
            <div className="lg:col-span-3 space-y-6">
              <div className="glass-panel p-2 rounded-2xl border border-zinc-850 overflow-hidden shadow-2xl relative">
                <img 
                  src={screenshots[activeScreenshot].image} 
                  alt={screenshots[activeScreenshot].title} 
                  className="w-full h-auto rounded-xl border border-zinc-900"
                />
              </div>
              <div className="px-2 space-y-1">
                <h4 className="font-black text-white text-lg font-outfit">{screenshots[activeScreenshot].title}</h4>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">{screenshots[activeScreenshot].description}</p>
              </div>
            </div>

          </div>
        </section>

        {/* FEATURES SHOWCASE SECTION */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20 sm:py-28 border-t border-zinc-900/60 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-neonLime">Comprehensive Engine</h2>
            <h3 className="text-3xl sm:text-4.5xl font-black text-white tracking-tight font-outfit">
              Premium Features
            </h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              FitNova AI equips you with everything needed to structure your fitness and nutrition habits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1: AI Coach */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4 hover:border-zinc-800 transition duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-neonLime/10 border border-neonLime/20 flex items-center justify-center text-neonLime group-hover:bg-neonLime group-hover:text-black transition-all">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white font-outfit">AI Coach</h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Generate custom workout routines and adaptive meal templates. Chat with the coach to get tips and adjust structures.
              </p>
            </div>

            {/* Card 2: Food Scanner */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4 hover:border-zinc-800 transition duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-neonCyan/10 border border-neonCyan/20 flex items-center justify-center text-neonCyan group-hover:bg-neonCyan group-hover:text-black transition-all">
                <Apple className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white font-outfit">Food AI Scanner</h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Snap photos of meals to run instant scanning, parse dietary ingredients, and calculate macro distribution ratios in seconds.
              </p>
            </div>

            {/* Card 3: AI Insights */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4 hover:border-zinc-800 transition duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-black transition-all">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white font-outfit">AI Insights</h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Receive personalized health notifications and automated macro logs mapping to targets to help you break plateaus.
              </p>
            </div>

            {/* Card 4: Achievement System */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4 hover:border-zinc-800 transition duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white font-outfit">Achievement Badges</h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Stay motivated by unlocking key consistency achievements, tracking workout volume thresholds, and preserving daily streaks.
              </p>
            </div>

            {/* Card 5: Nutrition Tracking */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4 hover:border-zinc-800 transition duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white font-outfit">Nutrition Tracking</h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Log meals manually, map items against a seeded database, track water consumption, and review metrics dynamically on the dashboard.
              </p>
            </div>

            {/* Card 6: Workout Tracking */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4 hover:border-zinc-800 transition duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-black transition-all">
                <Dumbbell className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white font-outfit">Workout Logging</h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Log active exercise sets, track weights and reps, record estimated 1RM trends, and manage custom training templates.
              </p>
            </div>

          </div>
        </section>

        {/* BENEFITS SECTION */}
        <section id="benefits" className="max-w-7xl mx-auto px-6 py-20 sm:py-28 border-t border-zinc-900/60 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-neonLime">True Utility</h2>
            <h3 className="text-3xl sm:text-4.5xl font-black text-white tracking-tight font-outfit">
              Why FitNova AI?
            </h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Designed to optimize wellness metrics and elevate workout consistency through automated logging.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              {/* Row 1 */}
              <div className="flex gap-4">
                <div className="p-1.5 h-7 w-7 rounded-full bg-neonLime/10 text-neonLime border border-neonLime/20 shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-white">Personalized Fitness Plans</h4>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    Custom exercise progressions built around your schedule, experience levels, gym access, and strength profile.
                  </p>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex gap-4">
                <div className="p-1.5 h-7 w-7 rounded-full bg-neonCyan/10 text-neonCyan border border-neonCyan/20 shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-white">Instant Nutrition Breakdown</h4>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    Automatic parsing of calorie, protein, carbohydrate, and fat metrics from visual scans, simplifying food logging.
                  </p>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex gap-4">
                <div className="p-1.5 h-7 w-7 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-white">Precise Progress Analytics</h4>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    Personal records logged over time mapping estimated one-rep-max curves, weight histories, and caloric trends.
                  </p>
                </div>
              </div>

              {/* Row 4 */}
              <div className="flex gap-4">
                <div className="p-1.5 h-7 w-7 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-white">AI-Powered Predictions</h4>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    Receive actionable training recommendations and dynamic macro adjustments based on historic trends and user consistency.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-neonLime to-neonCyan rounded-2xl blur opacity-5"></div>
              <div className="glass-panel p-2 rounded-2xl border border-zinc-850 overflow-hidden shadow-xl bg-zinc-950/10">
                <img 
                  src="/food_scanner_mockup.png" 
                  alt="FitNova AI Meal Scan breakdown preview" 
                  className="w-full h-auto rounded-xl border border-zinc-900 object-cover" 
                  loading="lazy"
                />
              </div>
            </div>

          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section className="max-w-7xl mx-auto px-6 py-20 sm:py-28 border-t border-zinc-900/60 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-neonLime">User Experience</h2>
            <h3 className="text-3xl sm:text-4.5xl font-black text-white tracking-tight font-outfit">
              FitNova Athlete Feedback
            </h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Read how our community structures their daily training and nutrition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="glass-panel p-6.5 rounded-2xl border border-zinc-850 flex flex-col justify-between space-y-6 hover:border-zinc-800 transition">
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed italic">
                "The Food AI Scanner has streamlined how I track calories. I snap a photo of my meal, and it outputs the macros directly. It's incredibly convenient."
              </p>
              <div className="flex items-center gap-3.5 pt-4 border-t border-zinc-900/60">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-extrabold text-sm text-neonLime uppercase">
                  SJ
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Sarah Jenkins</h4>
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Busy Professional</span>
                  <div className="flex gap-0.5 mt-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />)}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="glass-panel p-6.5 rounded-2xl border border-zinc-850 flex flex-col justify-between space-y-6 hover:border-zinc-800 transition">
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed italic">
                "As someone tracking personal records, the 1RM progression curves and template configurations are outstanding. The AI Coach helps structure workouts around my equipment."
              </p>
              <div className="flex items-center gap-3.5 pt-4 border-t border-zinc-900/60">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-extrabold text-sm text-neonCyan uppercase">
                  DC
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">David Chen</h4>
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Strength Trainer</span>
                  <div className="flex gap-0.5 mt-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />)}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="glass-panel p-6.5 rounded-2xl border border-zinc-850 flex flex-col justify-between space-y-6 hover:border-zinc-800 transition">
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed italic">
                "The badges keep me highly motivated! Tracking workout streaks and calorie logs has turned my fitness habits into a fun progression system."
              </p>
              <div className="flex items-center gap-3.5 pt-4 border-t border-zinc-900/60">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-extrabold text-sm text-purple-400 uppercase">
                  ER
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Elena Rodriguez</h4>
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Fitness Enthusiast</span>
                  <div className="flex gap-0.5 mt-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />)}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="max-w-4xl mx-auto px-6 py-20 sm:py-28 border-t border-zinc-900/60 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-neonLime">Common Questions</h2>
            <h3 className="text-3xl sm:text-4.5xl font-black text-white tracking-tight font-outfit">
              FAQ
            </h3>
            <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
              Find answers to core questions about FitNova's AI engines and data structures.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div 
                  key={idx}
                  className="glass-panel rounded-2xl border border-zinc-850 overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-extrabold text-slate-100 hover:text-white hover:bg-zinc-900/35 transition cursor-pointer text-sm sm:text-base font-outfit"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-neonLime' : ''}`} />
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-zinc-400 text-xs sm:text-sm leading-relaxed border-t border-zinc-900/40 animate-fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="max-w-7xl mx-auto px-6 py-12 pb-24">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-zinc-850 relative overflow-hidden text-center space-y-6 bg-gradient-to-br from-zinc-950 to-zinc-900/50">
            <div className="absolute top-0 right-0 w-80 h-80 bg-neonCyan/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-neonLime/5 rounded-full blur-[100px] pointer-events-none"></div>
            
            <h2 className="text-3xl sm:text-4.5xl font-black tracking-tight text-white font-outfit">
              Ready to Upgrade Your Fitness Ecosystem?
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Create your profile today, log your initial metrics, and let the AI Coach structure your training.
            </p>
            <div className="pt-2">
              <button 
                onClick={handleCTA}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-neonLime to-neonCyan text-black font-extrabold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[0_0_25px_rgba(163,230,53,0.25)] hover:scale-[1.01] transition-all duration-200 cursor-pointer text-xs sm:text-sm inline-flex items-center justify-center gap-2"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-6 text-[10px] text-zinc-500 font-bold uppercase tracking-wider pt-4">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-neonLime" /> SSL Encrypted</span>
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-neonCyan" /> Privacy Guaranteed</span>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 bg-zinc-950/60 py-16 text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-neonLime to-neonCyan flex items-center justify-center">
                <Dumbbell className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white font-outfit">
                FitNova<span className="text-neonLime">.AI</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xs">
              Premium client-side fitness and nutrition intelligence, built on fast API structures.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-black text-[10px] uppercase tracking-wider text-zinc-400">Features</h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#features" className="hover:text-neonLime transition-colors">AI Coach</a></li>
              <li><a href="#features" className="hover:text-neonLime transition-colors">Food Scanner</a></li>
              <li><a href="#features" className="hover:text-neonLime transition-colors">Insights & Analytics</a></li>
              <li><a href="#features" className="hover:text-neonLime transition-colors">Achievements</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-black text-[10px] uppercase tracking-wider text-zinc-400">Contact & Legal</h4>
            <ul className="space-y-2 text-[11px]">
              <li><span className="hover:text-neonLime cursor-pointer">support@fitnova.ai</span></li>
              <li><span className="hover:text-neonLime cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-neonLime cursor-pointer">Terms of Service</span></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-black text-[10px] uppercase tracking-wider text-zinc-400">Open Source</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Check out our developer resources, API schemas, and release packages on GitHub.
            </p>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 py-2 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-bold uppercase tracking-wider text-[10px] text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>GitHub Org</span>
            </a>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-medium text-zinc-650">
          <span>© 2026 FitNova AI. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            Designed for performance with <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /> on top of modern systems.
          </span>
        </div>
      </footer>

    </div>
  );
};
