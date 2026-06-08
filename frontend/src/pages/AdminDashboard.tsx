import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { API_BASE_URL } from '../config';
import { 
  Shield, 
  Users, 
  Activity, 
  Apple, 
  Coffee, 
  Dumbbell, 
  Search, 
  AlertTriangle, 
  RefreshCw, 
  Award, 
  Calendar, 
  Mail,
  UserCheck
} from 'lucide-react';

interface AdminStats {
  total_users: number;
  total_food_logs: number;
  total_meal_plans: number;
  total_exercises: number;
  active_users: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  total_food_logs: number;
  total_meal_plans: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [topUsers, setTopUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('fitnova_token');
    if (!token) {
      setError("Authentication token is missing. Please log in.");
      setLoading(false);
      return;
    }

    try {
      // Fetch stats
      const statsResponse = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsResponse.ok) {
        if (statsResponse.status === 403) {
          throw new Error("Access forbidden. Administrative privileges required.");
        }
        throw new Error("Failed to load platform statistics.");
      }
      const statsData = await statsResponse.json();

      // Fetch users
      const usersResponse = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!usersResponse.ok) throw new Error("Failed to load user directory.");
      const usersData = await usersResponse.json();

      // Fetch top active users
      const topResponse = await fetch(`${API_BASE_URL}/admin/top-users?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!topResponse.ok) throw new Error("Failed to load active users analysis.");
      const topData = await topResponse.json();

      setStats(statsData);
      setUsers(usersData);
      setTopUsers(topData);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while loading dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-8 animate-pulse">
          {/* Header Skeleton */}
          <div className="h-16 w-1/3 bg-zinc-900 rounded-xl"></div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
            ))}
          </div>

          {/* Table Area Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 h-96 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
            <div className="h-96 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-8 bg-red-950/20 border border-red-900/50 rounded-2xl max-w-2xl mx-auto mt-12 text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="font-extrabold text-white text-xl mb-2">Administrative Access Alert</h2>
          <p className="text-red-200/80 text-sm mb-6 max-w-md mx-auto">{error}</p>
          <button 
            onClick={fetchAdminData}
            className="inline-flex items-center gap-2 py-2.5 px-6 bg-red-500 hover:bg-red-600 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </Layout>
    );
  }

  // Calculate percentage of active users
  const activePercentage = stats && stats.total_users > 0 
    ? Math.round((stats.active_users / stats.total_users) * 100) 
    : 0;

  return (
    <Layout>
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-neonLime" />
            <span className="text-[10px] font-bold text-neonLime bg-neonLime/10 px-2 py-0.5 rounded border border-neonLime/20 uppercase tracking-widest">
              System Admin Portal
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            FitNova AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonLime to-neonCyan">Admin Dashboard</span>
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm mt-1">
            Analyze platform growth metrics, resource logs, and top user engagements.
          </p>
        </div>

        <button 
          onClick={fetchAdminData}
          className="self-start md:self-auto py-2 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          
          {/* Card 1: Total Users */}
          <div className="glass-panel p-5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-neonLime/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Total Users</span>
              <div className="p-2 bg-neonLime/10 text-neonLime rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <span className="text-3xl font-black text-slate-100">{stats.total_users}</span>
            <p className="text-[10px] text-zinc-400 mt-1">Registered accounts</p>
          </div>

          {/* Card 2: Active Users */}
          <div className="glass-panel p-5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-neonCyan/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Active Users</span>
              <div className="p-2 bg-neonCyan/10 text-neonCyan rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-100">{stats.active_users}</span>
              <span className="text-[10px] text-neonCyan font-bold">({activePercentage}%)</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Users with logged actions</p>
          </div>

          {/* Card 3: Food Logs */}
          <div className="glass-panel p-5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Food Logs</span>
              <div className="p-2 bg-amber-500/10 text-amber-450 rounded-xl">
                <Apple className="w-5 h-5" />
              </div>
            </div>
            <span className="text-3xl font-black text-slate-100">{stats.total_food_logs}</span>
            <p className="text-[10px] text-zinc-400 mt-1">Calorie meals logged</p>
          </div>

          {/* Card 4: Meal Plans */}
          <div className="glass-panel p-5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Meal Plans</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Coffee className="w-5 h-5" />
              </div>
            </div>
            <span className="text-3xl font-black text-slate-100">{stats.total_meal_plans}</span>
            <p className="text-[10px] text-zinc-400 mt-1">Custom schedules created</p>
          </div>

          {/* Card 5: Exercise Database */}
          <div className="glass-panel p-5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Exercises</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Dumbbell className="w-5 h-5" />
              </div>
            </div>
            <span className="text-3xl font-black text-slate-100">{stats.total_exercises}</span>
            <p className="text-[10px] text-zinc-400 mt-1">Library reference assets</p>
          </div>

        </div>
      )}

      {/* Main Tables Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: User Directory */}
        <div className="xl:col-span-2 glass-panel p-6 rounded-2xl border border-zinc-850 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-neonLime" />
                User Directory & Activity Management
              </h2>
              <p className="text-zinc-400 text-xs mt-0.5">
                Overview of all registered users, authorization roles, and counts of items tracked.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                placeholder="Search user name or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-neonLime transition-all"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto w-full -mx-6 px-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-850 text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 pr-4">User</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-center">Food Logs</th>
                  <th className="py-3.5 pl-4 text-center">Meal Plans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-zinc-900/30 transition-all">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center font-bold text-xs text-neonLime border border-zinc-800 group-hover:border-neonLime/30 transition-colors">
                            {user.name[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-100 block">{user.name}</span>
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-zinc-650" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                          {formatDate(user.created_at)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          user.role === 'admin' 
                            ? 'bg-neonLime/15 border-neonLime/25 text-neonLime' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block min-w-8 py-0.5 px-2 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-450 rounded-lg">
                          {user.total_food_logs}
                        </span>
                      </td>
                      <td className="py-4 pl-4 text-center">
                        <span className="inline-block min-w-8 py-0.5 px-2 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                          {user.total_meal_plans}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                      No user accounts match your search parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Top Active Users */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-850 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-neonCyan" />
              Top Active Users
            </h2>
            <p className="text-zinc-400 text-xs mb-6">
              Users ranked by cumulative food log entries tracked in FitNova.
            </p>

            <div className="space-y-4">
              {topUsers.length > 0 ? (
                topUsers.map((user, idx) => {
                  // Style colors for top ranks
                  const badgeColors = [
                    'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]', // Gold
                    'bg-slate-300 text-black border-slate-200 shadow-[0_0_10px_rgba(203,213,225,0.2)]', // Silver
                    'bg-amber-700 text-white border-amber-600 shadow-[0_0_10px_rgba(180,83,9,0.2)]' // Bronze
                  ];
                  
                  const isTopRank = idx < 3;
                  const rankClass = isTopRank 
                    ? badgeColors[idx] 
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800';

                  return (
                    <div 
                      key={user.id} 
                      className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl flex items-center justify-between hover:border-zinc-800 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-black tracking-tighter ${rankClass}`}>
                          {idx + 1}
                        </div>
                        <div className="truncate max-w-[150px] sm:max-w-xs md:max-w-[200px]">
                          <span className="font-bold text-xs text-slate-100 block truncate">{user.name}</span>
                          <span className="text-[10px] text-zinc-500 truncate block mt-0.5">{user.email}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-neonCyan block">{user.total_food_logs}</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Food Logs</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-zinc-500 text-xs text-center py-6">No user activity recorded yet.</p>
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-900 text-center">
            <span className="text-[10px] text-zinc-500 font-medium">
              Metric updates occur instantly on log changes.
            </span>
          </div>
        </div>

      </div>
    </Layout>
  );
};
