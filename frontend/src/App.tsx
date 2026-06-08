import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProfileSetup } from './pages/ProfileSetup';
import { Dashboard } from './pages/Dashboard';
import { Nutrition } from './pages/Nutrition';
import { MealPlans } from './pages/MealPlans';
import { Analytics } from './pages/Analytics';
import { WorkoutDiary } from './pages/WorkoutDiary';
import { WorkoutTemplates } from './pages/WorkoutTemplates';
import { ExerciseDatabase } from './pages/ExerciseDatabase';
import { WorkoutAnalytics } from './pages/WorkoutAnalytics';
import { AdminDashboard } from './pages/AdminDashboard';
import { AICoach } from './pages/AICoach';
import { AIInsights } from './pages/AIInsights';
import { FoodAIScanner } from './pages/FoodAIScanner';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
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

          {/* Protected Phase 3 Workout Pages */}
          <Route 
            path="/workouts" 
            element={
              <ProtectedRoute requireProfile={true}>
                <WorkoutDiary />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/workouts/templates" 
            element={
              <ProtectedRoute requireProfile={true}>
                <WorkoutTemplates />
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

          
          {/* Catch-all Route: Redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
