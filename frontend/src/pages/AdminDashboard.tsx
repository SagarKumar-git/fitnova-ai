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
  UserCheck,
  Download,
  Copy,
  Check,
  Flame,
  Sparkles,
  TrendingUp,
  X,
  Eye
} from 'lucide-react';

interface AdminStats {
  total_users: number;
  total_food_logs: number;
  total_meal_plans: number;
  total_exercises: number;
  active_users: number;
  total_ai_workouts?: number;
  total_ai_meal_plans?: number;
  total_achievements?: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  total_food_logs: number;
  total_meal_plans: number;
  total_ai_workouts?: number;
  total_achievements?: number;
}

interface DailyAnalyticsPoint {
  date: string;
  registrations: number;
  active_users: number;
  food_logs: number;
  meal_plans: number;
  ai_workouts: number;
  ai_meal_plans: number;
}

interface AdminAnalyticsResponse {
  start_date: string;
  end_date: string;
  series: DailyAnalyticsPoint[];
}

interface LeaderboardUser {
  id: string;
  name: string;
  email: string;
  score: number;
}

interface LeaderboardsData {
  top_workouts: LeaderboardUser[];
  top_nutrition: LeaderboardUser[];
  top_ai_coach: LeaderboardUser[];
  top_achievements: LeaderboardUser[];
  top_streaks: LeaderboardUser[];
}

// ----------------------------------------------------
// Native SVG Line Chart Component
// ----------------------------------------------------
interface NativeLineChartProps {
  data: { label: string; value: number }[];
  colorFrom: string;
  colorTo: string;
  title: string;
}

const NativeLineChart: React.FC<NativeLineChartProps> = ({ data, colorFrom, colorTo, title }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-xs">
        No data available
      </div>
    );
  }

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = 0;

  const svgWidth = 500;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getCoordinates = () => {
    return data.map((d, idx) => {
      const x = paddingLeft + (idx / Math.max(data.length - 1, 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.value / maxVal) * chartHeight;
      return { x, y, label: d.label, value: d.value };
    });
  };

  const coords = getCoordinates();

  let linePath = '';
  if (coords.length > 0) {
    linePath = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      linePath += ` L ${coords[i].x} ${coords[i].y}`;
    }
  }

  let areaPath = '';
  if (coords.length > 0) {
    areaPath = `${linePath} L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`;
  }

  const gradientId = `grad-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const fillGradId = `fill-${gradientId}`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelInterval = Math.max(Math.floor(data.length / 4), 1);

  return (
    <div className="glass-panel p-5 rounded-2xl border border-zinc-850 flex flex-col relative group">
      <h3 className="text-xs font-bold text-zinc-400 mb-4 tracking-wider uppercase">{title}</h3>
      
      {hoveredIdx !== null && coords[hoveredIdx] && (
        <div className="absolute top-12 right-6 bg-zinc-950/95 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-xl text-[10px] pointer-events-none z-10 animate-fade-in flex flex-col">
          <span className="text-zinc-500 font-bold">{new Date(coords[hoveredIdx].label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <span className="text-white font-black text-xs mt-0.5">
            {coords[hoveredIdx].value.toLocaleString()} {title.includes("User") || title.includes("Growth") ? "Users" : "Entries"}
          </span>
        </div>
      )}

      <div className="relative w-full">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
            <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorFrom} stopOpacity={0.2} />
              <stop offset="100%" stopColor={colorFrom} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {gridLines.map((ratio, idx) => {
            const y = paddingTop + chartHeight - ratio * chartHeight;
            const gridVal = Math.round(minVal + ratio * (maxVal - minVal));
            return (
              <g key={idx} className="opacity-20">
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={paddingLeft + chartWidth} 
                  y2={y} 
                  stroke="#4b5563" 
                  strokeDasharray="3,3" 
                />
                <text 
                  x={paddingLeft - 8} 
                  y={y + 4} 
                  fill="#9ca3af" 
                  fontSize="9" 
                  textAnchor="end"
                  className="font-semibold"
                >
                  {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill={`url(#${fillGradId})`} />}

          {linePath && (
            <path 
              d={linePath} 
              fill="none" 
              stroke={`url(#${gradientId})`} 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {coords.map((c, idx) => (
            <circle
              key={idx}
              cx={c.x}
              cy={c.y}
              r={hoveredIdx === idx ? 6 : 3}
              fill={hoveredIdx === idx ? colorTo : colorFrom}
              stroke="#09090b"
              strokeWidth={hoveredIdx === idx ? 2 : 1}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}

          {coords.map((c, idx) => {
            if (idx % labelInterval === 0 || idx === coords.length - 1) {
              const dateObj = new Date(c.label);
              const formattedLabel = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
              return (
                <text
                  key={idx}
                  x={c.x}
                  y={paddingTop + chartHeight + 16}
                  fill="#71717a"
                  fontSize="8"
                  textAnchor="middle"
                  className="font-bold uppercase tracking-wider"
                >
                  {formattedLabel}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// Native SVG Bar Chart Component (supports single & double series)
// ----------------------------------------------------
interface NativeBarChartProps {
  data: { label: string; value: number }[];
  colorFrom: string;
  colorTo: string;
  title: string;
  data2?: { label: string; value: number }[];
  label2?: string;
}

const NativeBarChart: React.FC<NativeBarChartProps> = ({ data, colorFrom, colorTo, title, data2, label2 }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-xs">
        No data available
      </div>
    );
  }

  const values = data.map(d => d.value);
  if (data2) {
    values.push(...data2.map(d => d.value));
  }
  const maxVal = Math.max(...values, 1);

  const svgWidth = 500;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const barCount = data.length;
  const spacingRatio = 0.35;
  const barContainerWidth = chartWidth / barCount;
  const barWidth = barContainerWidth * (1 - spacingRatio);

  const gradientId = `bar-grad-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const gradientId2 = `bar-grad-2-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelInterval = Math.max(Math.floor(data.length / 4), 1);

  return (
    <div className="glass-panel p-5 rounded-2xl border border-zinc-850 flex flex-col relative group">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">{title}</h3>
        {data2 && label2 && (
          <div className="flex items-center gap-3 text-[9px] font-bold">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: colorFrom }}></span>
              <span className="text-zinc-500 uppercase">Workouts</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: colorTo }}></span>
              <span className="text-zinc-500 uppercase">{label2}</span>
            </div>
          </div>
        )}
      </div>
      
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="absolute top-12 right-6 bg-zinc-950/95 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-xl text-[10px] pointer-events-none z-10 animate-fade-in flex flex-col">
          <span className="text-zinc-500 font-bold">
            {new Date(data[hoveredIdx].label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="text-white font-black text-xs mt-0.5">
            {data2 && data2[hoveredIdx] ? (
              <>
                <span className="block" style={{ color: colorFrom }}>Workout Plans: {data[hoveredIdx].value}</span>
                <span className="block" style={{ color: colorTo }}>Meal Plans: {data2[hoveredIdx].value}</span>
              </>
            ) : (
              `${data[hoveredIdx].value.toLocaleString()} Logs`
            )}
          </span>
        </div>
      )}

      <div className="relative w-full">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="100%" stopColor={colorFrom} stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id={gradientId2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorTo} />
              <stop offset="100%" stopColor={colorTo} stopOpacity={0.2} />
            </linearGradient>
          </defs>

          {gridLines.map((ratio, idx) => {
            const y = paddingTop + chartHeight - ratio * chartHeight;
            const gridVal = Math.round(ratio * maxVal);
            return (
              <g key={idx} className="opacity-20">
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={paddingLeft + chartWidth} 
                  y2={y} 
                  stroke="#4b5563" 
                  strokeDasharray="3,3" 
                />
                <text 
                  x={paddingLeft - 8} 
                  y={y + 4} 
                  fill="#9ca3af" 
                  fontSize="9" 
                  textAnchor="end"
                  className="font-semibold"
                >
                  {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal}
                </text>
              </g>
            );
          })}

          {data.map((d, idx) => {
            const containerX = paddingLeft + idx * barContainerWidth;
            
            if (data2 && data2[idx]) {
              const dualBarWidth = barWidth / 2 - 1;
              const bar1X = containerX + (barContainerWidth * spacingRatio) / 2;
              const bar2X = bar1X + dualBarWidth + 2;

              const bar1Height = (d.value / maxVal) * chartHeight;
              const bar2Height = (data2[idx].value / maxVal) * chartHeight;

              const bar1Y = paddingTop + chartHeight - bar1Height;
              const bar2Y = paddingTop + chartHeight - bar2Height;

              return (
                <g 
                  key={idx}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <rect
                    x={bar1X}
                    y={bar1Y}
                    width={dualBarWidth}
                    height={Math.max(bar1Height, 1.5)}
                    rx="1.5"
                    fill={hoveredIdx === idx ? colorFrom : `url(#${gradientId})`}
                    className="transition-all duration-200"
                  />
                  <rect
                    x={bar2X}
                    y={bar2Y}
                    width={dualBarWidth}
                    height={Math.max(bar2Height, 1.5)}
                    rx="1.5"
                    fill={hoveredIdx === idx ? colorTo : `url(#${gradientId2})`}
                    className="transition-all duration-200"
                  />
                </g>
              );
            } else {
              const barX = containerX + (barContainerWidth * spacingRatio) / 2;
              const barHeight = (d.value / maxVal) * chartHeight;
              const barY = paddingTop + chartHeight - barHeight;

              return (
                <rect
                  key={idx}
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(barHeight, 1.5)}
                  rx="2"
                  fill={hoveredIdx === idx ? colorFrom : `url(#${gradientId})`}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            }
          })}

          {data.map((d, idx) => {
            if (idx % labelInterval === 0 || idx === data.length - 1) {
              const x = paddingLeft + idx * barContainerWidth + barContainerWidth / 2;
              const dateObj = new Date(d.label);
              const formattedLabel = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
              return (
                <text
                  key={idx}
                  x={x}
                  y={paddingTop + chartHeight + 16}
                  fill="#71717a"
                  fontSize="8"
                  textAnchor="middle"
                  className="font-bold uppercase tracking-wider"
                >
                  {formattedLabel}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// Main AdminDashboard Page Component
// ----------------------------------------------------
export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering state
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [minAchievements, setMinAchievements] = useState<number | ''>('');
  const [joinStartDate, setJoinStartDate] = useState('');
  const [joinEndDate, setJoinEndDate] = useState('');

  // Analytics states
  const [rangeType, setRangeType] = useState('30d');
  const [analyticsStartDate, setAnalyticsStartDate] = useState(
    new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [analyticsEndDate, setAnalyticsEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Leaderboard states
  const [leaderboards, setLeaderboards] = useState<LeaderboardsData | null>(null);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'workouts' | 'nutrition' | 'ai' | 'achievements' | 'streaks'>('workouts');

  // Quick Action states
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

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
      // Fetch platform stats
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

      // Fetch user directory
      const usersResponse = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!usersResponse.ok) throw new Error("Failed to load user directory.");
      const usersData = await usersResponse.json();

      // Fetch leaderboards
      const lbResponse = await fetch(`${API_BASE_URL}/admin/leaderboards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (lbResponse.ok) {
        const lbData = await lbResponse.json();
        setLeaderboards(lbData);
      }

      setStats(statsData);
      setUsers(usersData);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while loading dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (range: string, start?: string, end?: string) => {
    setLoadingAnalytics(true);
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;
    try {
      let url = `${API_BASE_URL}/admin/analytics?range_type=${range}`;
      if (range === 'custom' && start && end) {
        url += `&start_date=${start}&end_date=${end}`;
      }
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Failed to load analytics series", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (rangeType !== 'custom' || (analyticsStartDate && analyticsEndDate)) {
      fetchAnalytics(rangeType, analyticsStartDate, analyticsEndDate);
    }
  }, [rangeType, analyticsStartDate, analyticsEndDate]);

  // Client side live filtering
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;

    const totalActivity = (user.total_food_logs || 0) + (user.total_meal_plans || 0) + (user.total_ai_workouts || 0);
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Active' && totalActivity > 0) || 
      (statusFilter === 'Inactive' && totalActivity === 0);

    const matchesAchievements = 
      minAchievements === '' || 
      (user.total_achievements || 0) >= Number(minAchievements);

    const joinDate = new Date(user.created_at);
    const matchesStartDate = !joinStartDate || joinDate >= new Date(joinStartDate);
    
    let endBoundary: Date | null = null;
    if (joinEndDate) {
      endBoundary = new Date(joinEndDate);
      endBoundary.setHours(23, 59, 59, 999);
    }
    const matchesEndDate = !endBoundary || joinDate <= endBoundary;

    return matchesSearch && matchesRole && matchesStatus && matchesAchievements && matchesStartDate && matchesEndDate;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper for CSV downloading
  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(value => {
          const strVal = String(value ?? '');
          if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
            return `"${strVal.replace(/"/g, '""')}"`;
          }
          return strVal;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportUserList = () => {
    const headers = ["Name", "Email", "Role", "Joined Date", "Food Logs", "Meal Plans", "AI Workouts", "Achievements"];
    const rows = filteredUsers.map(u => [
      u.name,
      u.email,
      u.role,
      formatDate(u.created_at),
      u.total_food_logs,
      u.total_meal_plans,
      u.total_ai_workouts ?? 0,
      u.total_achievements ?? 0
    ]);
    downloadCSV("fitnova_users.csv", headers, rows);
  };

  const exportAnalytics = () => {
    if (!analyticsData) return;
    const headers = ["Date", "Registrations", "Active Users", "Food Logs", "Meal Plans", "AI Workouts", "AI Meal Plans"];
    const rows = analyticsData.series.map(pt => [
      pt.date,
      pt.registrations,
      pt.active_users,
      pt.food_logs,
      pt.meal_plans,
      pt.ai_workouts,
      pt.ai_meal_plans
    ]);
    downloadCSV("fitnova_analytics.csv", headers, rows);
  };

  const exportAIUsage = () => {
    if (!analyticsData) return;
    const headers = ["Date", "AI Workouts Generated", "AI Meal Plans Generated"];
    const rows = analyticsData.series.map(pt => [
      pt.date,
      pt.ai_workouts,
      pt.ai_meal_plans
    ]);
    downloadCSV("fitnova_ai_usage.csv", headers, rows);
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!response.ok) throw new Error("Failed to update user role.");
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
    } catch (err: any) {
      alert(err.message || "Error updating role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopyFeedback(email);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const getActiveLeaderboardList = () => {
    if (!leaderboards) return [];
    switch (activeLeaderboardTab) {
      case 'workouts': return leaderboards.top_workouts;
      case 'nutrition': return leaderboards.top_nutrition;
      case 'ai': return leaderboards.top_ai_coach;
      case 'achievements': return leaderboards.top_achievements;
      case 'streaks': return leaderboards.top_streaks;
      default: return [];
    }
  };

  const getLeaderboardLabel = () => {
    switch (activeLeaderboardTab) {
      case 'workouts': return 'Workouts';
      case 'nutrition': return 'Food Logs';
      case 'ai': return 'AI Plans';
      case 'achievements': return 'Badges';
      case 'streaks': return 'Longest Streak (Days)';
      default: return 'Score';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-8 animate-pulse">
          <div className="h-16 w-1/3 bg-zinc-900 rounded-xl"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
            ))}
          </div>
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

  const activePercentage = stats && stats.total_users > 0 
    ? Math.round((stats.active_users / stats.total_users) * 100) 
    : 0;

  // Formatting chart series
  const registrationsChartData = analyticsData?.series.map(pt => ({ label: pt.date, value: pt.registrations })) || [];
  const activeUsersChartData = analyticsData?.series.map(pt => ({ label: pt.date, value: pt.active_users })) || [];
  const foodLogsChartData = analyticsData?.series.map(pt => ({ label: pt.date, value: pt.food_logs })) || [];
  const aiWorkoutsChartData = analyticsData?.series.map(pt => ({ label: pt.date, value: pt.ai_workouts })) || [];
  const aiMealsChartData = analyticsData?.series.map(pt => ({ label: pt.date, value: pt.ai_meal_plans })) || [];
  const workoutsTrendChartData = analyticsData?.series.map(pt => ({ label: pt.date, value: pt.meal_plans })) || []; // daily log trend

  return (
    <Layout>
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-neonLime" />
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

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={fetchAdminData}
            className="py-2 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
          
          <div className="relative group/export">
            <button className="py-2 px-4 bg-gradient-to-r from-neonLime to-neonCyan hover:brightness-110 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-zinc-950 border border-zinc-850 rounded-xl shadow-xl py-1 hidden group-hover/export:block hover:block z-20">
              <button onClick={exportUserList} className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-neonLime flex items-center gap-2 cursor-pointer">
                <Users className="w-3.5 h-3.5" />
                <span>Export User List</span>
              </button>
              <button onClick={exportAnalytics} className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-neonLime flex items-center gap-2 cursor-pointer">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Export Analytics</span>
              </button>
              <button onClick={exportAIUsage} className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-neonLime flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Export AI Usage</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          
          {/* Card 1: Total Users */}
          <div className="glass-panel p-4.5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-neonLime/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider">Total Users</span>
              <div className="p-1.5 bg-neonLime/10 text-neonLime rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2.5xl font-black text-slate-100">{stats.total_users}</span>
              <span className="text-[9px] font-bold text-neonLime flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                +12%
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-0.5">Registered accounts</p>
          </div>

          {/* Card 2: Active Users */}
          <div className="glass-panel p-4.5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-neonCyan/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider">Active Users</span>
              <div className="p-1.5 bg-neonCyan/10 text-neonCyan rounded-lg">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2.5xl font-black text-slate-100">{stats.active_users}</span>
              <span className="text-[9px] text-neonCyan font-black">({activePercentage}%)</span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-0.5">Platform active rate</p>
          </div>

          {/* Card 3: Food Logs */}
          <div className="glass-panel p-4.5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider">Food Logs</span>
              <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                <Apple className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2.5xl font-black text-slate-100">{stats.total_food_logs}</span>
              <span className="text-[9px] font-bold text-amber-500 flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                +8%
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-0.5">Nutrition inputs logged</p>
          </div>

          {/* Card 4: AI Workouts */}
          <div className="glass-panel p-4.5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider">AI Workouts</span>
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2.5xl font-black text-slate-100">{stats.total_ai_workouts ?? 0}</span>
              <span className="text-[9px] font-bold text-indigo-400 flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                +15%
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-0.5">AI plans generated</p>
          </div>

          {/* Card 5: AI Meal Plans */}
          <div className="glass-panel p-4.5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider">AI Meal Plans</span>
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Coffee className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2.5xl font-black text-slate-100">{stats.total_ai_meal_plans ?? 0}</span>
              <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                +18%
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-0.5">Diet programs generated</p>
          </div>

          {/* Card 6: Achievement Unlocks */}
          <div className="glass-panel p-4.5 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-lg pointer-events-none"></div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider">Achievements</span>
              <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2.5xl font-black text-slate-100">{stats.total_achievements ?? 0}</span>
              <span className="text-[9px] font-bold text-purple-400 flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                +24%
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-0.5">Badges unlocked by users</p>
          </div>

        </div>
      )}

      {/* Analytics Section & Charts */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-850 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-zinc-900 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neonLime" />
              Business Intelligence & Analytics Charts
            </h2>
            <p className="text-zinc-400 text-xs mt-0.5">
              Visualize platform usage metrics, user registrations, and tool generation stats.
            </p>
          </div>

          {/* Range filter selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-850 flex items-center">
              {['7d', '30d', '90d', 'custom'].map((range) => (
                <button
                  key={range}
                  onClick={() => setRangeType(range)}
                  className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer ${
                    rangeType === range 
                      ? 'bg-gradient-to-r from-neonLime to-neonCyan text-black font-black' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'Custom'}
                </button>
              ))}
            </div>

            {rangeType === 'custom' && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <input 
                  type="date" 
                  value={analyticsStartDate} 
                  onChange={(e) => setAnalyticsStartDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-slate-100 focus:outline-none focus:border-neonLime"
                />
                <span className="text-zinc-650 text-[10px]">to</span>
                <input 
                  type="date" 
                  value={analyticsEndDate} 
                  onChange={(e) => setAnalyticsEndDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-slate-100 focus:outline-none focus:border-neonLime"
                />
              </div>
            )}
          </div>
        </div>

        {loadingAnalytics ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-neonLime animate-spin" />
            <span className="text-xs text-zinc-500">Compiling database analytics series...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NativeLineChart 
              data={registrationsChartData} 
              colorFrom="#a3e635" 
              colorTo="#84cc16" 
              title="User Registrations (Daily Growth)" 
            />
            <NativeLineChart 
              data={activeUsersChartData} 
              colorFrom="#06b6d4" 
              colorTo="#0891b2" 
              title="Active Users (Daily Engagements)" 
            />
            <NativeBarChart 
              data={foodLogsChartData} 
              colorFrom="#f59e0b" 
              colorTo="#d97706" 
              title="Daily Food Log Intakes" 
            />
            <NativeBarChart 
              data={aiWorkoutsChartData} 
              data2={aiMealsChartData}
              label2="Meals"
              colorFrom="#6366f1" 
              colorTo="#10b981" 
              title="AI Coach Generator Usage" 
            />
            <div className="lg:col-span-2">
              <NativeBarChart 
                data={workoutsTrendChartData} 
                colorFrom="#10b981" 
                colorTo="#059669" 
                title="Workout Templates Logged Trend" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Directory & Leaderboards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: User Directory */}
        <div className="xl:col-span-2 glass-panel p-6 rounded-2xl border border-zinc-850 flex flex-col">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-neonLime" />
                  User Directory & Management
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Search, inspect, and update roles or access details instantly.
                </p>
              </div>
            </div>

            {/* Granular Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-zinc-950/65 p-4 rounded-xl border border-zinc-900 text-xs">
              {/* Search */}
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">Search Name/Email</span>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-slate-100 placeholder-zinc-650 focus:outline-none focus:border-neonLime"
                  />
                </div>
              </div>

              {/* Filter by Role */}
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">Role</span>
                <select 
                  value={roleFilter} 
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-slate-100 focus:outline-none focus:border-neonLime"
                >
                  <option value="All">All Roles</option>
                  <option value="user">User</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Filter by Active Status */}
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">Status</span>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-slate-100 focus:outline-none focus:border-neonLime"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active (Has logs)</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Filter by Min Achievements */}
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">Min Badges</span>
                <input 
                  type="number" 
                  placeholder="e.g. 0" 
                  min="0"
                  value={minAchievements}
                  onChange={(e) => setMinAchievements(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-slate-100 focus:outline-none focus:border-neonLime"
                />
              </div>

              {/* Filter by Joined Date Start */}
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">Joined Date Start</span>
                <input 
                  type="date" 
                  value={joinStartDate}
                  onChange={(e) => setJoinStartDate(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-900 border border-zinc-850 rounded-lg text-slate-100 focus:outline-none focus:border-neonLime"
                />
              </div>

              {/* Filter by Joined Date End */}
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">Joined Date End</span>
                <input 
                  type="date" 
                  value={joinEndDate}
                  onChange={(e) => setJoinEndDate(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-900 border border-zinc-850 rounded-lg text-slate-100 focus:outline-none focus:border-neonLime"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto w-full -mx-6 px-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-850 text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider">
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 px-3">Joined Date</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-2 text-center">Food Logs</th>
                  <th className="py-3 px-2 text-center">AI Workouts</th>
                  <th className="py-3 px-2 text-center">Badges</th>
                  <th className="py-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-zinc-900/20 transition-all">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center font-bold text-[11px] text-neonLime border border-zinc-800 group-hover:border-neonLime/30 transition-colors">
                            {user.name[0].toUpperCase()}
                          </div>
                          <div className="truncate max-w-[130px] sm:max-w-xs">
                            <span className="font-bold text-xs text-slate-100 block truncate">{user.name}</span>
                            <span className="text-[9px] text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-2.5 h-2.5 text-zinc-650" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-[10px] font-medium text-zinc-400 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-600" />
                          {formatDate(user.created_at)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-block text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          user.role === 'admin' 
                            ? 'bg-neonLime/15 border-neonLime/20 text-neonLime' 
                            : user.role === 'trainer'
                            ? 'bg-neonCyan/15 border-neonCyan/20 text-neonCyan'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className="inline-block min-w-7 py-0.5 px-1.5 text-[9px] font-bold bg-amber-500/10 border border-amber-500/15 text-amber-500 rounded">
                          {user.total_food_logs}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className="inline-block min-w-7 py-0.5 px-1.5 text-[9px] font-bold bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 rounded">
                          {user.total_ai_workouts ?? 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className="inline-block min-w-7 py-0.5 px-1.5 text-[9px] font-bold bg-purple-500/10 border border-purple-500/15 text-purple-400 rounded">
                          {user.total_achievements ?? 0}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Info */}
                          <button 
                            onClick={() => setSelectedUser(user)}
                            className="p-1 bg-zinc-900 border border-zinc-800 hover:border-neonLime rounded text-zinc-400 hover:text-neonLime transition cursor-pointer"
                            title="Inspect User Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Copy Email */}
                          <button 
                            onClick={() => copyEmail(user.email)}
                            className="p-1 bg-zinc-900 border border-zinc-800 hover:border-neonCyan rounded text-zinc-400 hover:text-neonCyan transition cursor-pointer"
                            title="Copy Email"
                          >
                            {copyFeedback === user.email ? (
                              <Check className="w-3.5 h-3.5 text-neonCyan" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Quick promote/demote */}
                          {updatingRole === user.id ? (
                            <span className="w-5 h-5 rounded-full border border-t-transparent border-neonLime animate-spin"></span>
                          ) : user.role === 'admin' ? (
                            <button
                              onClick={() => handleRoleUpdate(user.id, 'user')}
                              className="px-2 py-0.75 bg-red-950/45 hover:bg-red-900 border border-red-900/40 hover:border-red-600 rounded text-[9px] font-bold text-red-400 hover:text-white transition cursor-pointer"
                              title="Demote to User"
                            >
                              Demote
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleUpdate(user.id, 'admin')}
                              className="px-2 py-0.75 bg-neonLime/10 hover:bg-neonLime border border-neonLime/20 hover:border-none rounded text-[9px] font-extrabold text-neonLime hover:text-black transition cursor-pointer"
                              title="Promote to Admin"
                            >
                              Promote
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 text-xs">
                      No user accounts match your search parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Leaderboards Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-850 flex flex-col">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-neonCyan" />
              FitNova Leaderboards
            </h2>
            <p className="text-zinc-400 text-xs mb-4">
              Top rankings across activities, consistency streaks, and achievements.
            </p>

            {/* Tab Selector */}
            <div className="grid grid-cols-5 bg-zinc-950 p-1 rounded-xl border border-zinc-850 mb-5 text-[9px] font-extrabold tracking-wider text-center">
              <button
                onClick={() => setActiveLeaderboardTab('workouts')}
                className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer ${
                  activeLeaderboardTab === 'workouts' ? 'bg-zinc-900 text-neonLime' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Top Workouts Logged"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Workouts</span>
              </button>
              <button
                onClick={() => setActiveLeaderboardTab('nutrition')}
                className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer ${
                  activeLeaderboardTab === 'nutrition' ? 'bg-zinc-900 text-amber-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Top Nutrition Loggers"
              >
                <Apple className="w-3.5 h-3.5" />
                <span>Nutrition</span>
              </button>
              <button
                onClick={() => setActiveLeaderboardTab('ai')}
                className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer ${
                  activeLeaderboardTab === 'ai' ? 'bg-zinc-900 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Top AI Coach Users"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Coach</span>
              </button>
              <button
                onClick={() => setActiveLeaderboardTab('achievements')}
                className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer ${
                  activeLeaderboardTab === 'achievements' ? 'bg-zinc-900 text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Top Badges Unlocked"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Badges</span>
              </button>
              <button
                onClick={() => setActiveLeaderboardTab('streaks')}
                className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer ${
                  activeLeaderboardTab === 'streaks' ? 'bg-zinc-900 text-neonCyan' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Longest Activity Streaks"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Streaks</span>
              </button>
            </div>

            {/* List */}
            <div className="space-y-3">
              {getActiveLeaderboardList().length > 0 ? (
                getActiveLeaderboardList().map((user, idx) => {
                  const badgeColors = [
                    'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
                    'bg-slate-300 text-black border-slate-200 shadow-[0_0_10px_rgba(203,213,225,0.25)]',
                    'bg-amber-700 text-white border-amber-600 shadow-[0_0_10px_rgba(180,83,9,0.25)]'
                  ];
                  
                  const isTopRank = idx < 3;
                  const rankClass = isTopRank 
                    ? badgeColors[idx] 
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800';

                  return (
                    <div 
                      key={user.id} 
                      className="p-2.5 bg-zinc-950/60 border border-zinc-900 rounded-xl flex items-center justify-between hover:border-zinc-800 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`w-5.5 h-5.5 rounded-full border flex items-center justify-center text-[9px] font-black tracking-tighter shrink-0 ${rankClass}`}>
                          {idx + 1}
                        </div>
                        <div className="truncate max-w-[130px] sm:max-w-xs md:max-w-[200px]">
                          <span className="font-bold text-xs text-slate-100 block truncate">{user.name}</span>
                          <span className="text-[9px] text-zinc-500 truncate block mt-0.5">{user.email}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-neonCyan block">{user.score}</span>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">{getLeaderboardLabel()}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-zinc-500 text-xs text-center py-8">No leaderboard data found for this category.</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-900 text-center shrink-0">
            <span className="text-[9px] text-zinc-500 font-medium">
              Metrics are synced directly on every user workout, meal, or badge unlock.
            </span>
          </div>
        </div>

      </div>

      {/* Profile & Activity Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-850 max-w-lg w-full rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Header Accent Line */}
            <div className="h-1 bg-gradient-to-r from-neonLime to-neonCyan"></div>

            {/* Close Button */}
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-1.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Content */}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-neonLime to-neonCyan flex items-center justify-center font-black text-2xl text-black shadow-lg">
                  {selectedUser.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    {selectedUser.name}
                    <span className={`inline-block text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      selectedUser.role === 'admin' 
                        ? 'bg-neonLime/15 border-neonLime/20 text-neonLime' 
                        : selectedUser.role === 'trainer'
                        ? 'bg-neonCyan/15 border-neonCyan/20 text-neonCyan'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}>
                      {selectedUser.role}
                    </span>
                  </h3>
                  <span className="text-xs text-zinc-400 block mt-0.5">{selectedUser.email}</span>
                </div>
              </div>

              {/* Joined Date info */}
              <div className="p-3 bg-zinc-900/50 border border-zinc-900 rounded-xl flex items-center gap-2 mb-6 text-xs text-zinc-400">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span>Joined platform on <strong className="text-zinc-300 font-bold">{formatDate(selectedUser.created_at)}</strong></span>
              </div>

              {/* Statistics Grid */}
              <h4 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-3">Activity Summary</h4>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                  <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Food Entries</span>
                  <span className="text-xl font-black text-amber-500">{selectedUser.total_food_logs}</span>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                  <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Meal Plans</span>
                  <span className="text-xl font-black text-emerald-400">{selectedUser.total_meal_plans}</span>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                  <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">AI Workouts</span>
                  <span className="text-xl font-black text-indigo-400">{selectedUser.total_ai_workouts ?? 0}</span>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                  <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Unlocked Badges</span>
                  <span className="text-xl font-black text-purple-400">{selectedUser.total_achievements ?? 0}</span>
                </div>
              </div>

              {/* Admin Actions Panel */}
              <div className="border-t border-zinc-900 pt-5 mt-4">
                <h4 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-3">Admin Authority Controls</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => copyEmail(selectedUser.email)}
                    className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copyFeedback === selectedUser.email ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-neonCyan" />
                        <span>Copied Email</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Email</span>
                      </>
                    )}
                  </button>

                  {selectedUser.role === 'admin' ? (
                    <button
                      onClick={() => handleRoleUpdate(selectedUser.id, 'user')}
                      className="flex-1 py-2 px-3 bg-red-950/20 hover:bg-red-900 border border-red-900/40 text-xs font-bold text-red-400 hover:text-white rounded-xl transition cursor-pointer"
                    >
                      Remove Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRoleUpdate(selectedUser.id, 'admin')}
                      className="flex-1 py-2 px-3 bg-neonLime hover:bg-neonLime-dark text-black text-xs font-black rounded-xl transition cursor-pointer"
                    >
                      Promote to Admin
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
