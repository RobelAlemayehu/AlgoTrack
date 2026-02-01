import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Activity, BookOpen, Settings, Bell, 
  Search, RefreshCw, Flame, Trophy, Code, ChevronLeft, ChevronRight,
  User as UserIcon, Lock, Mail, CheckCircle2, AlertCircle, Plus,
  BarChart3, TrendingUp, Calendar, Clock, Star, Play, Share2, Edit3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';

function App() {
  // --- AUTH & NAVIGATION STATE ---
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [activeTab, setActiveTab] = useState('Home');
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });

  // --- DATA STATE ---
  const [problems, setProblems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userSettings, setUserSettings] = useState({ leetcodeHandle: '', codeforcesHandle: '' });
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const itemsPerPage = 6;

  // --- 1. AUTHENTICATION LOGIC ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        // Clear previous user's data
        setProblems([]);
        setAnalytics(null);
        setNotes([]);
        setLastSyncTime(null);
        setUserSettings({ leetcodeHandle: '', codeforcesHandle: '' });
      } else {
        alert(data.msg || "Authentication failed");
      }
    } catch (err) {
      alert("Backend server not running on port 5000");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    // Clear all user data on logout
    setProblems([]);
    setAnalytics(null);
    setNotes([]);
    setLastSyncTime(null);
    setUserSettings({ leetcodeHandle: '', codeforcesHandle: '' });
  };

  // --- 2. DATA FETCHING (PROTECTED) ---
  const fetchData = async () => {
    if (!token) return;
    try {
      // First get user settings to check if they have handles
      const settingsRes = await fetch(`http://localhost:5000/api/auth/profile`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const handles = {
          leetcodeHandle: settingsData.handles?.leetcode || '',
          codeforcesHandle: settingsData.handles?.codeforces || ''
        };
        setUserSettings(handles);
        
        // Only fetch problems if user has configured handles
        if (handles.leetcodeHandle || handles.codeforcesHandle) {
          const problemsRes = await fetch(`http://localhost:5000/api/sync/all`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
          });
          const problemsData = await problemsRes.json();
          setProblems(Array.isArray(problemsData) ? problemsData : []);
        } else {
          // Clear problems if no handles configured
          setProblems([]);
        }
      } else {
        // No profile found, clear everything
        setProblems([]);
        setUserSettings({ leetcodeHandle: '', codeforcesHandle: '' });
      }
      
      // Try to fetch analytics (may not exist yet)
      try {
        const analyticsRes = await fetch(`http://localhost:5000/api/analytics/dashboard`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }
      } catch (err) {
        console.log('Analytics endpoint not available yet');
      }
      
      // Try to fetch notes (may not exist yet)
      try {
        const notesRes = await fetch(`http://localhost:5000/api/notes`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (notesRes.ok) {
          const notesData = await notesRes.json();
          setNotes(Array.isArray(notesData) ? notesData : []);
        }
      } catch (err) {
        console.log('Notes endpoint not available yet');
      }
      
    } catch (err) {
      console.error("Error fetching data:", err);
      // Clear data on error
      setProblems([]);
      setUserSettings({ leetcodeHandle: '', codeforcesHandle: '' });
    }
  };

  useEffect(() => { 
    if (token) {
      fetchData();
      
      // Listen for data updates from settings
      const handleDataUpdate = (event) => {
        setProblems(event.detail.problems);
        setLastSyncTime(new Date());
      };
      
      window.addEventListener('dataUpdated', handleDataUpdate);
      return () => window.removeEventListener('dataUpdated', handleDataUpdate);
    }
  }, [token]);

  const handleSync = async () => {
    if (!userSettings.leetcodeHandle && !userSettings.codeforcesHandle) {
      alert('Please add your LeetCode or Codeforces handle in Settings first!');
      return;
    }
    
    setLoading(true);
    try {
      const syncPromises = [];
      
      if (userSettings.codeforcesHandle) {
        syncPromises.push(
          fetch('http://localhost:5000/api/sync/codeforces', { 
            headers: { 'Authorization': `Bearer ${token}` } 
          })
        );
      }
      
      if (userSettings.leetcodeHandle) {
        syncPromises.push(
          fetch('http://localhost:5000/api/sync/leetcode', { 
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ handle: userSettings.leetcodeHandle })
          })
        );
      }
      
      await Promise.all(syncPromises);
      await fetchData();
      setLastSyncTime(new Date());
    } catch (err) {
      alert("Sync failed. Check your handles in settings.");
    }
    setLoading(false);
  };

  // --- 3. DYNAMIC CALCULATIONS ---
  const totalSolved = problems.length;
  const reviewNeeded = problems.filter(p => p.status === 'Review').length;
  const cfCount = problems.filter(p => p.platform === 'Codeforces').length;
  const lcCount = problems.filter(p => p.platform === 'LeetCode').length;
  const peakRating = problems.length > 0 ? Math.max(...problems.map(p => parseInt(p.difficulty) || 0)) : 0;
  
  const totalPages = Math.ceil(problems.length / itemsPerPage);
  const currentItems = problems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const calculateStreak = (probs) => {
    if (!probs || !Array.isArray(probs) || probs.length === 0) return 0;
    try {
      const dates = [...new Set(probs.map(p => new Date(p.syncedAt || p.createdAt || Date.now()).toDateString()))]
        .map(d => new Date(d)).sort((a, b) => b - a);
      let streak = 0;
      let today = new Date(); today.setHours(0, 0, 0, 0);
      if (Math.floor((today - dates[0]) / 86400000) > 1) return 0;
      for (let i = 0; i < dates.length; i++) {
        if (i === 0 || Math.floor((dates[i-1] - dates[i]) / 86400000) === 1) streak++;
        else break;
      }
      return streak;
    } catch (err) {
      return 0;
    }
  };

  // --- AUTH SCREEN VIEW ---
  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B0E14] text-white">
        <div className="w-full max-w-md p-8 bg-[#151B26] rounded-2xl border border-gray-800 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-black font-bold mx-auto mb-4">CS</div>
            <h2 className="text-2xl font-bold">{isLoginView ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-gray-500 text-sm mt-2">CodeSync Platform</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLoginView && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-gray-500" size={18} />
                <input type="text" placeholder="Username" required className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 focus:border-emerald-500 outline-none text-sm" onChange={(e) => setAuthForm({...authForm, username: e.target.value})}/>
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="email" placeholder="Email Address" required className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 focus:border-emerald-500 outline-none text-sm" onChange={(e) => setAuthForm({...authForm, email: e.target.value})}/>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="password" placeholder="Password" required className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 focus:border-emerald-500 outline-none text-sm" onChange={(e) => setAuthForm({...authForm, password: e.target.value})}/>
            </div>
            <button className="w-full bg-emerald-500 text-black font-bold py-2.5 rounded-lg hover:bg-emerald-400 transition-colors mt-2">
              {loading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-6 cursor-pointer hover:text-emerald-400" onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? "Don't have an account? Create one" : "Already have an account? Sign in"}
          </p>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="flex h-screen bg-[#0B0E14] text-gray-300 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0B0E14] border-r border-gray-800 flex flex-col p-6">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-bold">CS</div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-wide">CodeSync</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
          <SidebarItem icon={<Activity size={20}/>} label="DSA Tracker" active={activeTab === 'Tracker'} onClick={() => setActiveTab('Tracker')} />
          <SidebarItem icon={<BarChart3 size={20}/>} label="Analytics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} />
          <SidebarItem icon={<BookOpen size={20}/>} label="Notes" active={activeTab === 'Notes'} onClick={() => setActiveTab('Notes')} />
        </nav>

        <div className="pt-6 border-t border-gray-800 space-y-4">
          <SidebarItem icon={<Settings size={20}/>} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
          <div className="flex items-center justify-between mt-4 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black text-xs font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-white font-medium">{user?.username || 'alex_dev'}</p>
                <p className="text-[10px] text-gray-500">{user?.tier || 'Free Tier'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 text-[10px] font-bold uppercase">Exit</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-[#0B0E14] sticky top-0 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input type="text" placeholder="Search problems..." className="w-full bg-[#151B26] text-sm text-gray-300 pl-10 pr-4 py-2 rounded-lg border border-gray-800 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex items-center gap-6">
            <button onClick={handleSync} disabled={loading} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${loading ? 'bg-emerald-900 text-emerald-400 cursor-not-allowed' : 'bg-emerald-500 text-black hover:bg-emerald-400'}`}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Syncing..." : "Sync Now"}
            </button>
            <Bell className="text-gray-400 hover:text-white cursor-pointer" size={20} />
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'Home' && (
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <StatCard title="TOTAL SOLVED" value={totalSolved} subtext="Keep it up!" subColor="text-emerald-400">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle2 size={20}/></div>
                </StatCard>
                <StatCard title="CURRENT STREAK" value={`${calculateStreak(problems)} Days`} subtext="Flame on" subColor="text-orange-500">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500"><Flame size={20}/></div>
                </StatCard>
                <StatCard title="REVIEW NEEDED" value={reviewNeeded} subtext="Critical issues" subColor="text-yellow-400">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500"><AlertCircle size={20}/></div>
                </StatCard>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-[#151B26] rounded-xl border border-gray-800 p-6">
                  <h3 className="text-white font-semibold mb-6">Recent Activity</h3>
                  <div className="space-y-3">
                    {currentItems.map(p => (
                      <div key={p.problemId} className="flex items-center justify-between p-3 bg-[#0B0E14] rounded-lg border border-gray-800 hover:border-emerald-500/20 transition">
                        <div className="flex items-center gap-3">
                          <Code size={16} className="text-emerald-500"/>
                          <span className="text-sm font-medium text-white">{p.title}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${getDifficultyColor(p.difficulty)}`}>{p.difficulty}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#151B26] rounded-xl border border-gray-800 p-6">
                  <h3 className="text-white font-semibold mb-6">Skill Breakdown</h3>
                  <div className="space-y-5">
                    <SkillBar label="Codeforces" pct={`${Math.min(Math.round((cfCount/100)*100), 100)}%`} />
                    <SkillBar label="LeetCode" pct={`${Math.min(Math.round((lcCount/100)*100), 100)}%`} />
                    <SkillBar label="Accuracy" pct="85%" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Tracker' && <TrackerView problems={problems} lastSyncTime={lastSyncTime} />}
          {activeTab === 'Analytics' && <AnalyticsView problems={problems} analytics={analytics} />}
          {activeTab === 'Notes' && <NotesView notes={notes} />}
          {activeTab === 'Settings' && <SettingsView userSettings={userSettings} setUserSettings={setUserSettings} token={token} />}
        </div>
      </main>
    </div>
  );
}

// --- HELPER COMPONENTS ---
function SidebarItem({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition ${active ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
      {icon}<span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function StatCard({ title, value, subtext, subColor, children }) {
  return (
    <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800 flex justify-between items-start">
      <div>
        <p className="text-xs font-bold text-gray-500 tracking-wider mb-1 uppercase">{title}</p>
        <h2 className="text-3xl font-bold text-white mb-1">{value}</h2>
        <p className={`text-[10px] font-medium ${subColor}`}>{subtext}</p>
      </div>
      {children}
    </div>
  );
}

function SkillBar({ label, pct }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-400 font-bold">{label}</span><span className="text-white">{pct}</span></div>
      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: pct }}></div></div>
    </div>
  );
}

function getDifficultyColor(rating) {
  if (!rating) return 'text-gray-500';
  const r = parseInt(rating);
  if (r < 1200 || rating === 'Easy') return 'text-emerald-400 border border-emerald-500/20 bg-emerald-500/5';
  if (r < 1900 || rating === 'Medium') return 'text-yellow-400 border border-yellow-500/20 bg-yellow-500/5';
  return 'text-red-400 border border-red-500/20 bg-red-500/5';
}

// --- TRACKER VIEW ---
function TrackerView({ problems, lastSyncTime }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  const safeProblems = Array.isArray(problems) ? problems : [];
  const totalPages = Math.ceil(safeProblems.length / itemsPerPage);
  const currentItems = safeProblems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  const totalSolved = safeProblems.length;
  const reviewNeeded = safeProblems.filter(p => p && p.status === 'Review').length;
  
  // Calculate real daily streak from problem dates
  const calculateRealStreak = () => {
    if (safeProblems.length === 0) return 0;
    
    const dates = safeProblems
      .map(p => new Date(p.createdAt || p.lastUpdated || Date.now()))
      .map(d => d.toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    const today = new Date().toDateString();
    
    for (let i = 0; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (currentDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };
  
  const dailyStreak = calculateRealStreak();
  
  // Get last sync time - use passed lastSyncTime or fallback to most recent problem
  const getLastSyncTime = () => {
    const syncTime = lastSyncTime || (safeProblems.length > 0 ? 
      safeProblems.reduce((latest, current) => {
        const latestDate = new Date(latest.createdAt || latest.lastUpdated || 0);
        const currentDate = new Date(current.createdAt || current.lastUpdated || 0);
        return currentDate > latestDate ? current : latest;
      }) : null);
    
    if (!syncTime) return 'Never';
    
    const syncDate = lastSyncTime || new Date(syncTime.createdAt || syncTime.lastUpdated);
    const now = new Date();
    const diffMs = now - syncDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">DSA Tracker</h1>
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            Last synced {getLastSyncTime()}
          </div>
        </div>
        <button className="flex items-center gap-2 bg-emerald-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-emerald-400">
          <Plus size={16} /> Sync from URL
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Solved</span>
            <CheckCircle2 className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalSolved}</div>
          <div className="text-xs text-emerald-400 font-medium">+{Math.floor(totalSolved * 0.1)} this week</div>
        </div>
        
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Review Needed</span>
            <AlertCircle className="text-yellow-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{reviewNeeded}</div>
          <div className="text-xs text-gray-400">{Math.floor(reviewNeeded * 0.3)} critical issues</div>
        </div>
        
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Daily Streak</span>
            <Flame className="text-orange-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{dailyStreak} days</div>
          <div className="text-xs text-orange-500 font-medium">Top 5%</div>
        </div>
      </div>

      <div className="bg-[#151B26] rounded-xl border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 border-b border-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <div>Problem Name</div>
          <div>Platform</div>
          <div>Difficulty</div>
          <div>Status</div>
          <div>Last Solved</div>
        </div>
        
        {currentItems.length > 0 ? currentItems.map((problem, idx) => (
          <div key={idx} className="grid grid-cols-5 gap-4 p-4 border-b border-gray-800/50 hover:bg-gray-800/20">
            <div className="text-white font-medium">{problem?.title || 'Problem'}</div>
            <div className="flex items-center gap-2">
              <Code className={problem?.platform === 'LeetCode' ? 'text-orange-500' : 'text-blue-500'} size={16} />
              <span className="text-sm">{problem?.platform || 'Platform'}</span>
            </div>
            <div>
              <span className={`text-xs px-2 py-1 rounded font-bold ${
                problem?.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                problem?.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' :
                problem?.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400' :
                'bg-gray-500/10 text-gray-400'
              }`}>
                {problem?.difficulty || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-xs px-2 py-1 rounded font-bold bg-emerald-500/10 text-emerald-400">
                • Solved
              </span>
            </div>
            <div className="text-sm text-gray-400">
              {problem?.createdAt ? 
                (() => {
                  const date = new Date(problem.createdAt);
                  const now = new Date();
                  const diffMs = now - date;
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  
                  if (diffMins < 60) return `${diffMins}m ago`;
                  if (diffHours < 24) return `${diffHours}h ago`;
                  if (diffDays < 30) return `${diffDays}d ago`;
                  return date.toLocaleDateString();
                })() : 
                'Unknown'
              }
            </div>
          </div>
        )) : (
          <div className="p-8 text-center text-gray-400">
            <p>No problems found. Sync your accounts to get started!</p>
          </div>
        )}
        
        {safeProblems.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-gray-400">Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, safeProblems.length)} of {safeProblems.length} problems</div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- ANALYTICS VIEW ---
function AnalyticsView({ problems, analytics }) {
  const safeProblems = Array.isArray(problems) ? problems : [];
  
  const globalRank = 1245;
  const currentStreak = safeProblems.length > 0 ? Math.min(safeProblems.length, 30) : 14;
  const totalProblems = safeProblems.length;
  const accuracy = 76;

  const revisionQueue = safeProblems.filter(p => p && p.status === 'Review').slice(0, 3);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Global Rank</div>
          <div className="text-3xl font-bold text-white mb-1">{globalRank.toLocaleString()}</div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> 12%
          </div>
        </div>
        
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Streak</div>
          <div className="text-3xl font-bold text-white mb-1">{currentStreak} Days</div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> 2%
          </div>
        </div>
        
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Problems</div>
          <div className="text-3xl font-bold text-white mb-1">{totalProblems}</div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> 5%
          </div>
        </div>
        
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Accuracy</div>
          <div className="text-3xl font-bold text-white mb-1">{accuracy}%</div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> 8%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold">Codeforces Rating History</h3>
            <div className="text-right">
              <div className="text-sm text-gray-400">Last 6 Months</div>
              <div className="text-emerald-400 text-sm font-bold">+142 pts</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-2xl font-bold text-emerald-400 mb-1">1942</div>
            <div className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold inline-block">CANDIDATE MASTER</div>
          </div>
          <div className="h-32 bg-gray-800/20 rounded flex items-center justify-center">
            <span className="text-gray-500 text-sm">Chart visualization</span>
          </div>
        </div>
        
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold">Problems Solved per Week</h3>
            <div className="text-right">
              <div className="text-sm text-gray-400">Weekly Target: 50</div>
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mb-4">42</div>
          <div className="h-32 bg-gray-800/20 rounded flex items-center justify-center">
            <span className="text-gray-500 text-sm">Chart visualization</span>
          </div>
        </div>
      </div>

      <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
        <h3 className="text-white font-semibold mb-6">Topic Mastery Heatmap</h3>
        <div className="space-y-4">
          {['Dynamic Programming', 'Graph Theory', 'Trees & BST'].map((topic) => (
            <div key={topic} className="flex items-center gap-4">
              <div className="w-32 text-sm text-gray-400">{topic}</div>
              <div className="flex gap-1">
                {Array.from({ length: 52 }, (_, i) => (
                  <div key={i} className="w-3 h-3 rounded-sm bg-emerald-600"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {revisionQueue.length > 0 && (
        <div className="bg-[#151B26] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold">Revision Queue</h3>
            <button className="text-emerald-400 text-sm hover:text-emerald-300">View All Queue</button>
          </div>
          <div className="space-y-3">
            {revisionQueue.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-[#0B0E14] rounded-lg border border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded font-bold bg-yellow-500/10 text-yellow-400">
                    {item?.difficulty || 'Medium'}
                  </span>
                  <div>
                    <div className="text-white font-medium text-sm">{item?.title || 'Problem'}</div>
                    <div className="text-xs text-gray-400">{item?.platform || 'Platform'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">DUE IN</div>
                    <div className="text-emerald-400 text-sm font-bold">2h 30m</div>
                  </div>
                  <Play className="text-emerald-500 cursor-pointer hover:text-emerald-400" size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- NOTES VIEW ---
function NotesView({ notes }) {
  const [selectedNote, setSelectedNote] = useState('Dijkstra\'s Algorithm');
  const safeNotes = notes || [];
  
  // Generate dynamic content based on actual notes or use template
  const noteContent = safeNotes.length > 0 ? {
    title: safeNotes[0].title || 'Algorithm Note',
    explanation: safeNotes[0].explanation || safeNotes[0].content || "This is a dynamic note from your collection.",
    complexity: safeNotes[0].complexity || { time: "O(n)", space: "O(1)" },
    lastUpdated: safeNotes[0].lastUpdated || safeNotes[0].createdAt || new Date(),
    tags: safeNotes[0].tags || []
  } : {
    title: selectedNote,
    explanation: "Dijkstra's algorithm is a greedy algorithm for finding the shortest paths between nodes in a graph.",
    complexity: { time: "O((V + E) log V)", space: "O(V)" },
    lastUpdated: new Date(),
    tags: ['Graph', 'Shortest Path']
  };

  return (
    <div className="flex h-[calc(100vh-140px)]">
      {/* Sidebar */}
      <div className="w-64 bg-[#0B0E14] border-r border-gray-800 p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-white font-bold text-lg mb-2">Cheat Sheets</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full bg-[#151B26] text-sm pl-10 pr-4 py-2 rounded-lg border border-gray-800 focus:outline-none focus:border-emerald-500" 
            />
          </div>
        </div>
        
        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Library</h3>
          <div className="space-y-2">
            {[
              { name: 'C++ STL', icon: Code },
              { name: 'Graph Templates', icon: Activity },
              { name: 'Dynamic Programming', icon: BarChart3 },
              { name: 'Bit Manipulation', icon: Settings },
              { name: 'System Design', icon: Trophy }
            ].map((cat) => (
              <div key={cat.name} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-gray-400 hover:text-white hover:bg-gray-800">
                <cat.icon size={16} />
                <span className="text-sm">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Dynamic Notes List */}
        {safeNotes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Your Notes ({safeNotes.length})</h3>
            <div className="space-y-2">
              {safeNotes.slice(0, 5).map((note, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedNote(note.title || note.name || `Note ${idx + 1}`)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <BookOpen size={16} />
                  <span className="text-sm truncate">{note.title || note.name || `Note ${idx + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Recent Items</h3>
          <div className="space-y-2">
            {safeNotes.length > 0 ? safeNotes.slice(0, 2).map((note, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white cursor-pointer">
                <Clock size={16} />
                <span className="text-sm">{note.title || note.name || 'Recent Note'}</span>
              </div>
            )) : (
              <div className="text-sm text-gray-500">No recent notes</div>
            )}
          </div>
        </div>
        
        <div className="mt-auto">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span className="text-xs font-bold text-emerald-400">GitHub Sync Active</span>
            </div>
            <div className="text-xs text-gray-400">Last synced: {safeNotes.length > 0 ? '2m ago' : 'Never'}</div>
          </div>
          <button className="w-full bg-emerald-500 text-black font-semibold py-2 rounded-lg hover:bg-emerald-400 transition flex items-center justify-center gap-2">
            <Plus size={16} /> New Note
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <span>DSA</span>
                  <ChevronRight size={14} />
                  <span>Graphs</span>
                  <ChevronRight size={14} />
                  <span className="text-white">{noteContent.title}</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">{noteContent.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Code size={14} />
                    <span>github.com/user/dsa-notes</span>
                  </div>
                  <span>•</span>
                  <span>Updated {new Date(noteContent.lastUpdated).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#151B26] border border-gray-800 rounded-lg text-sm hover:bg-gray-800">
                  <Edit3 size={16} /> Edit on GitHub
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#151B26] border border-gray-800 rounded-lg text-sm hover:bg-gray-800">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-800 px-6">
            <div className="flex gap-6">
              {['Explanation', 'Code Implementation', 'Complexity'].map((tab) => (
                <button 
                  key={tab}
                  className={`py-3 px-1 text-sm font-medium border-b-2 transition ${
                    tab === 'Explanation' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl">
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed mb-6">
                  {noteContent.explanation}
                </p>
                
                <div className="bg-[#151B26] border border-gray-800 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-emerald-500 rounded"></div>
                    <h3 className="text-xl font-bold text-white">Algorithm Overview</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    {safeNotes.length > 0 && safeNotes[0].overview ? safeNotes[0].overview : 
                    "The algorithm maintains a set of visited nodes and a set of unvisited nodes. It starts at a defined source node and repeatedly selects the unvisited node with the smallest distance."}
                  </p>
                </div>
                
                <div className="bg-[#151B26] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-emerald-500 rounded"></div>
                    <h3 className="text-xl font-bold text-white">Complexity Analysis</h3>
                  </div>
                  <p className="text-gray-300 mb-4">
                    Time and space complexity for this algorithm:
                  </p>
                  <div className="bg-[#0B0E14] border border-gray-800 rounded-lg p-4">
                    <div className="text-lg font-mono text-emerald-400 mb-2">Time: {noteContent.complexity.time}</div>
                    <div className="text-lg font-mono text-emerald-400">Space: {noteContent.complexity.space}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="w-64 border-l border-gray-800 p-6">
          <h3 className="text-white font-semibold mb-4">On This Page</h3>
          <div className="space-y-2 text-sm">
            {['Overview', 'Algorithm Flow', 'Complexity Analysis', 'Implementation'].map((item, idx) => (
              <div key={item} className={`cursor-pointer py-1 ${
                idx === 0 ? 'text-emerald-400 border-l-2 border-emerald-500 pl-3' : 'text-gray-400 hover:text-white pl-3'
              }`}>
                {item}
              </div>
            ))}
          </div>
          
          <div className="mt-8">
            <h4 className="text-white font-semibold mb-4">Helpful resources</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 cursor-pointer">
                <Code size={14} />
                <span>Visualizer</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 cursor-pointer">
                <Code size={14} />
                <span>LeetCode 743</span>
              </div>
            </div>
            
            {noteContent.tags.length > 0 && (
              <div className="mt-6">
                <h5 className="text-white font-medium mb-2 text-sm">Tags</h5>
                <div className="flex flex-wrap gap-1">
                  {noteContent.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SETTINGS VIEW ---
function SettingsView({ userSettings, setUserSettings, token }) {
  const [formData, setFormData] = useState(userSettings || { leetcodeHandle: '', codeforcesHandle: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Update form when userSettings change
  useEffect(() => {
    setFormData(userSettings || { leetcodeHandle: '', codeforcesHandle: '' });
  }, [userSettings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          handles: {
            leetcode: formData.leetcodeHandle,
            codeforces: formData.codeforcesHandle
          }
        })
      });
      
      if (res.ok) {
        setUserSettings(formData);
        setMessage('Settings saved successfully! Syncing your data...');
        
        // Auto-sync user's data after saving handles
        setTimeout(async () => {
          try {
            const syncPromises = [];
            
            if (formData.codeforcesHandle) {
              syncPromises.push(
                fetch('http://localhost:5000/api/sync/codeforces', { 
                  headers: { 'Authorization': `Bearer ${token}` } 
                })
              );
            }
            
            if (formData.leetcodeHandle) {
              syncPromises.push(
                fetch('http://localhost:5000/api/sync/leetcode', { 
                  method: 'POST',
                  headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ handle: formData.leetcodeHandle })
                })
              );
            }
            
            await Promise.all(syncPromises);
            
            // Fetch the synced data
            const problemsRes = await fetch(`http://localhost:5000/api/sync/all`, { 
              headers: { 'Authorization': `Bearer ${token}` } 
            });
            const problemsData = await problemsRes.json();
            
            // Update parent component with new data
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
              detail: { problems: Array.isArray(problemsData) ? problemsData : [] }
            }));
            
            setMessage('Data synced successfully!');
            setTimeout(() => setMessage(''), 3000);
          } catch (err) {
            setMessage('Sync failed. Please try manual sync.');
            setTimeout(() => setMessage(''), 3000);
          }
        }, 1000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (err) {
      setMessage('Error saving settings');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            message.includes('success') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className="bg-[#151B26] rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Platform Handles</h2>
        <p className="text-gray-400 text-sm mb-6">
          Connect your coding platform accounts to sync your solved problems automatically.
        </p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              LeetCode Handle
            </label>
            <div className="relative">
              <Code className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="text"
                value={formData.leetcodeHandle}
                onChange={(e) => setFormData({...formData, leetcodeHandle: e.target.value})}
                placeholder="Enter your LeetCode username"
                className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Example: john_doe (from https://leetcode.com/john_doe/)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Codeforces Handle
            </label>
            <div className="relative">
              <Code className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="text"
                value={formData.codeforcesHandle}
                onChange={(e) => setFormData({...formData, codeforcesHandle: e.target.value})}
                placeholder="Enter your Codeforces handle"
                className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Example: tourist (from https://codeforces.com/profile/tourist)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
          <div className="text-sm text-gray-400">
            Changes will be saved to your profile and used for automatic syncing.
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              loading 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-emerald-500 text-black hover:bg-emerald-400'
            }`}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-[#151B26] rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sync Status</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#0B0E14] rounded-lg border border-gray-800">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                formData.leetcodeHandle ? 'bg-emerald-400' : 'bg-gray-600'
              }`}></div>
              <div>
                <div className="text-white font-medium">LeetCode</div>
                <div className="text-sm text-gray-400">
                  {formData.leetcodeHandle ? `Connected as ${formData.leetcodeHandle}` : 'Not connected'}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {formData.leetcodeHandle ? 'Ready to sync' : 'Add handle to enable'}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#0B0E14] rounded-lg border border-gray-800">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                formData.codeforcesHandle ? 'bg-emerald-400' : 'bg-gray-600'
              }`}></div>
              <div>
                <div className="text-white font-medium">Codeforces</div>
                <div className="text-sm text-gray-400">
                  {formData.codeforcesHandle ? `Connected as ${formData.codeforcesHandle}` : 'Not connected'}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {formData.codeforcesHandle ? 'Ready to sync' : 'Add handle to enable'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#151B26] rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">How Syncing Works</h2>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 text-xs font-bold mt-0.5">1</div>
            <div>
              <div className="text-white font-medium mb-1">Add Your Handles</div>
              <div>Enter your LeetCode and Codeforces usernames in the fields above.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 text-xs font-bold mt-0.5">2</div>
            <div>
              <div className="text-white font-medium mb-1">Automatic Sync</div>
              <div>Click "Sync Now" in the header to fetch your latest solved problems.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 text-xs font-bold mt-0.5">3</div>
            <div>
              <div className="text-white font-medium mb-1">Track Progress</div>
              <div>View your progress in the Dashboard and Analytics sections.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;