import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Activity, BookOpen, Settings, Bell, 
  Search, RefreshCw, Flame, Trophy, Code, ChevronLeft, ChevronRight,
  User as UserIcon, Lock, Mail, CheckCircle2, AlertCircle
} from 'lucide-react';

function App() {
  // --- AUTH & NAVIGATION STATE ---
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [activeTab, setActiveTab] = useState('Home');
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });

  // --- DATA STATE ---
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
  };

  // --- 2. DATA FETCHING (PROTECTED) ---
  const fetchData = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/sync/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProblems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => { if (token) fetchData(); }, [token]);

  const handleSync = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetch('http://localhost:5000/api/sync/codeforces', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/sync/leetcode', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      await fetchData(); 
    } catch (err) {
      alert("Sync failed. Check your handles in settings.");
    }
    setLoading(false);
  };

  // --- 3. DYNAMIC CALCULATIONS ---
  const totalSolved = problems.length;
  const cfCount = problems.filter(p => p.platform === 'Codeforces').length;
  const lcCount = problems.filter(p => p.platform === 'LeetCode').length;
  const peakRating = problems.length > 0 ? Math.max(...problems.map(p => parseInt(p.difficulty) || 0)) : 0;
  
  const totalPages = Math.ceil(problems.length / itemsPerPage);
  const currentItems = problems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const calculateStreak = (probs) => {
    if (!probs.length) return 0;
    const dates = [...new Set(probs.map(p => new Date(p.syncedAt).toDateString()))]
      .map(d => new Date(d)).sort((a, b) => b - a);
    let streak = 0;
    let today = new Date(); today.setHours(0, 0, 0, 0);
    if (Math.floor((today - dates[0]) / 86400000) > 1) return 0;
    for (let i = 0; i < dates.length; i++) {
      if (i === 0 || Math.floor((dates[i-1] - dates[i]) / 86400000) === 1) streak++;
      else break;
    }
    return streak;
  };

  // --- AUTH SCREEN VIEW ---
  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B0E14] text-white">
        <div className="w-full max-w-md p-8 bg-[#151B26] rounded-2xl border border-gray-800 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-black font-bold mx-auto mb-4">CS</div>
            <h2 className="text-2xl font-bold">{isLoginView ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-gray-500 text-sm mt-2">DEVSYNC : EMERALD EDITION</p>
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
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-bold">D</div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-wide">DEVSYNC</h1>
            <p className="text-[10px] text-emerald-400 tracking-wider font-bold">EMERALD EDITION</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
          <SidebarItem icon={<Activity size={20}/>} label="Tracker" active={activeTab === 'Tracker'} onClick={() => setActiveTab('Tracker')} />
          <SidebarItem icon={<Trophy size={20}/>} label="Analytics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} />
          <SidebarItem icon={<BookOpen size={20}/>} label="Notes" active={activeTab === 'Notes'} onClick={() => setActiveTab('Notes')} />
        </nav>

        <div className="pt-6 border-t border-gray-800 space-y-4">
          <SidebarItem icon={<Settings size={20}/>} label="Settings" />
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
                <StatCard title="PEAK DIFFICULTY" value={peakRating} subtext="Max Rating" subColor="text-blue-400">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><Trophy size={20}/></div>
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

          {activeTab !== 'Home' && (
            <div className="bg-[#151B26] p-20 rounded-2xl border border-gray-800 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">{activeTab} View</h2>
              <p className="text-gray-500">Functionality for {activeTab} coming in the next backend update!</p>
            </div>
          )}
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

export default App;