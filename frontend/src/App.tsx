import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { WorkoutProvider } from './features/workout/state/WorkoutContext';
import { ErrorBoundary } from './features/workout/components/ErrorBoundary';

// Lazy-loaded application pages
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup').then((m) => ({ default: m.ProfileSetup })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Nutrition = lazy(() => import('./pages/Nutrition').then((m) => ({ default: m.Nutrition })));
const MealPlans = lazy(() => import('./pages/MealPlans').then((m) => ({ default: m.MealPlans })));
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const WorkoutDiary = lazy(() => import('./pages/WorkoutDiary').then((m) => ({ default: m.WorkoutDiary })));
const WorkoutTemplates = lazy(() => import('./pages/WorkoutTemplates').then((m) => ({ default: m.WorkoutTemplates })));
const ExerciseDatabase = lazy(() => import('./pages/ExerciseDatabase').then((m) => ({ default: m.ExerciseDatabase })));
const WorkoutAnalytics = lazy(() => import('./pages/WorkoutAnalytics').then((m) => ({ default: m.WorkoutAnalytics })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AICoach = lazy(() => import('./pages/AICoach').then((m) => ({ default: m.AICoach })));
const AIInsights = lazy(() => import('./pages/AIInsights').then((m) => ({ default: m.AIInsights })));
const FoodAIScanner = lazy(() => import('./pages/FoodAIScanner').then((m) => ({ default: m.FoodAIScanner })));

// Lazy-loaded Workout OS pages
const WorkoutHome = lazy(() => import('./features/workout/pages/WorkoutHome').then((m) => ({ default: m.WorkoutHome })));
const WorkoutDetails = lazy(() => import('./features/workout/pages/WorkoutDetails').then((m) => ({ default: m.WorkoutDetails })));
const ActiveWorkout = lazy(() => import('./features/workout/pages/ActiveWorkout').then((m) => ({ default: m.ActiveWorkout })));
const WorkoutHistory = lazy(() => import('./features/workout/pages/WorkoutHistory').then((m) => ({ default: m.WorkoutHistory })));
const WorkoutStats = lazy(() => import('./features/workout/pages/WorkoutStats').then((m) => ({ default: m.WorkoutStats })));

const PageLoader = () => (
  <div className="min-h-screen bg-[#020817] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(57,255,20,0.3)]" />
      <span className="text-xs font-semibold text-[#94A3B8] tracking-wider uppercase">Loading FitNova AI...</span>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <WorkoutProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
          {/* Public Landing Page Route */}
          <Route path="/" element={<LandingPage />} />

          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Onboarding Profile Form */}
          <Route 
            path="/profile-setup" 
            element={
              <ProtectedRoute requireProfile={false}>
                <ProfileSetup />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Analytics and Targets Dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requireProfile={true}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Protected Phase 2 Pages */}
          <Route 
            path="/nutrition" 
            element={
              <ProtectedRoute requireProfile={true}>
                <Nutrition />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/food-ai-scanner" 
            element={
              <ProtectedRoute requireProfile={true}>
                <FoodAIScanner />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/meal-plans" 
            element={
              <ProtectedRoute requireProfile={true}>
                <MealPlans />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute requireProfile={true}>
                <Analytics />
              </ProtectedRoute>
            } 
          />

          {/* Workout OS Sprint 3.2 Routes */}
          <Route 
            path="/workouts" 
            element={
              <ProtectedRoute requireProfile={true}>
                <ErrorBoundary fallbackMessage="Failed to load Workout Hub.">
                  <WorkoutHome />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/workouts/active" 
            element={
              <ProtectedRoute requireProfile={true}>
                <ErrorBoundary fallbackMessage="Failed to load Active Session.">
                  <ActiveWorkout />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/workouts/history" 
            element={
              <ProtectedRoute requireProfile={true}>
                <ErrorBoundary fallbackMessage="Failed to load Workout History.">
                  <WorkoutHistory />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/workouts/stats" 
            element={
              <ProtectedRoute requireProfile={true}>
                <ErrorBoundary fallbackMessage="Failed to load Workout Analytics.">
                  <WorkoutStats />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/workouts/:id" 
            element={
              <ProtectedRoute requireProfile={true}>
                <ErrorBoundary fallbackMessage="Failed to load Workout Details.">
                  <WorkoutDetails />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />

          {/* Preserved Previous Workout Routes */}
          <Route 
            path="/workouts/templates" 
            element={
              <ProtectedRoute requireProfile={true}>
                <WorkoutTemplates />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/workouts/diary" 
            element={
              <ProtectedRoute requireProfile={true}>
                <WorkoutDiary />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/exercises" 
            element={
              <ProtectedRoute requireProfile={true}>
                <ExerciseDatabase />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/workout-analytics" 
            element={
              <ProtectedRoute requireProfile={true}>
                <WorkoutAnalytics />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireProfile={true} requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/ai-coach" 
            element={
              <ProtectedRoute requireProfile={true}>
                <AICoach />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/ai-insights" 
            element={
              <ProtectedRoute requireProfile={true}>
                <AIInsights />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all Route: send authenticated users to dashboard, others to login */}
          <Route 
            path="*" 
            element={
              <ProtectedRoute requireProfile={false}>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } 
          />
            </Routes>
          </Suspense>
        </WorkoutProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
