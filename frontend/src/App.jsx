import React, { useState, useEffect } from 'react';
import './index.css';

import Popup        from './components/ui/Popup';
import Sidebar      from './components/layout/Sidebar';
import Header       from './components/layout/Header';
import ToastContainer from './components/ToastContainer';

import AuthView      from './views/AuthView';
import DashboardView from './views/DashboardView';
import TrackerView   from './views/TrackerView';
import AnalyticsView from './views/AnalyticsView';
import NotesView     from './views/NotesView';
import SettingsView  from './views/SettingsView';
import CompareView   from './views/CompareView';
import ReviewView    from './views/ReviewView';
import ProfileView   from './views/ProfileView';
import RoadmapsView  from './views/RoadmapsView';
import DrillView     from './views/DrillView';
import SimulatorView from './views/SimulatorView';
import PublicProfileView from './views/PublicProfileView';
import GroupsView    from './views/GroupsView';

const API = import.meta.env.VITE_API || 'http://localhost:5000';

function getLocalDateStr(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hasSolvedToday(problems = [], lcCalendar = {}) {
  const todayStr = getLocalDateStr(new Date());
  if (!todayStr) return false;

  // 1. Check MongoDB problems (Codeforces, LeetCode, Manual) using solvedAt
  const solvedInDb = (problems || []).some(p => {
    if (p.archived) return false;
    const solveDate = p.solvedAt || p.createdAt;
    return getLocalDateStr(solveDate) === todayStr;
  });

  if (solvedInDb) return true;

  // 2. Check LeetCode calendar timestamps
  const solvedInLcCal = Object.keys(lcCalendar || {}).some(ts => {
    const count = lcCalendar[ts];
    if (count > 0) {
      const num = Number(ts);
      if (!isNaN(num) && num > 0) {
        return getLocalDateStr(num * 1000) === todayStr;
      }
    }
    return false;
  });

  return solvedInLcCal;
}

function calcStreak(problems, lcCalendar) {
  const daySet = new Set();
  (problems || []).forEach(p => {
    if (p.archived) return;
    const dayStr = getLocalDateStr(p.solvedAt || p.createdAt);
    if (dayStr) daySet.add(dayStr);
  });

  Object.keys(lcCalendar || {}).forEach(ts => {
    const count = lcCalendar[ts];
    if (count > 0) {
      const num = Number(ts);
      if (!isNaN(num) && num > 0) {
        const dayStr = getLocalDateStr(num * 1000);
        if (dayStr) daySet.add(dayStr);
      }
    }
  });

  if (daySet.size === 0) return 0;

  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterdayDate);

  if (!daySet.has(todayStr) && !daySet.has(yesterdayStr)) return 0;

  const startStr = daySet.has(todayStr) ? todayStr : yesterdayStr;
  const parts = startStr.split('-').map(Number);
  const curr = new Date(parts[0], parts[1] - 1, parts[2]);

  let streak = 0;
  while (true) {
    const checkStr = getLocalDateStr(curr);
    if (daySet.has(checkStr)) {
      streak++;
      curr.setDate(curr.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user,  setUser]  = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [authErr, setAuthErr] = useState('');

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // PWA Service Worker Registration
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg failed:', err));
    }
  }, []);

  // ── Nav / Search ──────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState('Home');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  // ── Core data ─────────────────────────────────────────────────────────────
  const [problems,      setProblems]      = useState([]);
  const [backendStreak, setBackendStreak] = useState(null);
  const [userSettings,  setUserSettings]  = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      return {
        leetcodeHandle:   u?.handles?.leetcode   || '',
        codeforcesHandle: u?.handles?.codeforces || ''
      };
    } catch {
      return { leetcodeHandle: '', codeforcesHandle: '' };
    }
  });
  const [lastSyncTime,  setLastSyncTime]  = useState(null);
  const [loading,       setLoading]       = useState(false);

  // ── LeetCode real data ────────────────────────────────────────────────────
  const [lcStats,    setLcStats]    = useState(null);   // { easy, medium, hard, total, ranking }
  const [lcCalendar, setLcCalendar] = useState(null);   // { "unixTs": count, ... }

  // ── Codeforces profile ────────────────────────────────────────────────────
  const [cfRating,   setCfRating]   = useState(0);
  const [cfMaxRating,setCfMaxRating]= useState(0);
  const [cfRank,     setCfRank]     = useState('');

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [popup, setPopup] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const showPopup = (title, message, type = 'info') => setPopup({ isOpen: true, title, message, type });
  const closePopup = () => setPopup(p => ({ ...p, isOpen: false }));

  // Check for daily solve and notifications
  useEffect(() => {
    if (!token) return;
    const checkActivity = () => {
      const solvedToday = hasSolvedToday(problems, lcCalendar);

      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const msLeft = endOfDay - now;
      const hrsLeft = msLeft / (1000 * 60 * 60);

      if (!solvedToday && hrsLeft <= 6) {
        setNotifications([{
          id: 'streak-warning',
          text: `🔥 You haven't solved a problem today! ${Math.floor(hrsLeft)}h left to keep your streak!`,
          urgency: 'high'
        }]);
      } else {
        setNotifications([]);
      }
    };

    checkActivity();
    const timer = setInterval(checkActivity, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [token, problems, lcCalendar]);

  // ── Fetch user profile + problems ─────────────────────────────────────────
  const fetchData = async () => {
    if (!token) return;
    try {
      const profRes = await fetch(`${API}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profRes.ok) {
        const profData = await profRes.json();
        setUser(prev => {
          const updated = { ...(prev || {}), ...profData };
          localStorage.setItem('user', JSON.stringify(updated));
          return updated;
        });
        setUserSettings({
          leetcodeHandle:   profData.handles?.leetcode   || '',
          codeforcesHandle: profData.handles?.codeforces || '',
          lcSession:        profData.handles?.lcSession  || ''
        });
        if (profData.lcStats)     setLcStats(profData.lcStats);
        if (profData.lcCalendar)  setLcCalendar(profData.lcCalendar);
        if (profData.cfRating)    setCfRating(profData.cfRating);
        if (profData.cfMaxRating) setCfMaxRating(profData.cfMaxRating);
        if (profData.cfRank)      setCfRank(profData.cfRank);
        if (profData.preferences?.theme) setTheme(profData.preferences.theme);
      }

      const tzOffset = new Date().getTimezoneOffset();
      const probRes = await fetch(`${API}/api/sync/all?tzOffset=${tzOffset}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (probRes.ok) {
        const probData = await probRes.json();
        const probsArray = Array.isArray(probData) ? probData : (probData.problems || []);
        setProblems(probsArray);
        if (!Array.isArray(probData) && typeof probData.streak === 'number') {
          setBackendStreak(probData.streak);
        }
      }
    } catch (err) {
      console.error('fetchData error:', err);
    }
  };

  useEffect(() => { if (token) fetchData(); }, [token]);

  // Listen for sync broadcasts from SettingsView
  useEffect(() => {
    const handler = e => {
      if (e.detail.problems)    setProblems(e.detail.problems);
      if (e.detail.lcStats)     setLcStats(e.detail.lcStats);
      if (e.detail.lcCalendar)  setLcCalendar(e.detail.lcCalendar);
      if (e.detail.cfRating)    setCfRating(e.detail.cfRating);
      if (e.detail.cfMaxRating) setCfMaxRating(e.detail.cfMaxRating);
      if (e.detail.cfRank)      setCfRank(e.detail.cfRank);
      setLastSyncTime(new Date());
    };
    window.addEventListener('dataUpdated', handler);
    return () => window.removeEventListener('dataUpdated', handler);
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleAuth = async (form, isLogin) => {
    setLoading(true); setAuthErr('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const res  = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
        setToken(data.token); setUser(data.user);
        setProblems([]); setLcStats({}); setLcCalendar({});
        setCfRating(0); setCfRank(''); setLastSyncTime(null);
      } else {
        setAuthErr(data.msg || 'Authentication failed');
      }
    } catch {
      setAuthErr('Unable to reach the server. Please ensure the backend is running.');
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    setToken(null); setUser(null); setProblems([]);
    setLcStats({}); setLcCalendar({}); setCfRating(0); setCfRank('');
    setUserSettings({ leetcodeHandle: '', codeforcesHandle: '' });
    setLastSyncTime(null); setActiveTab('Home');
  };

  // ── Sync ──────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!userSettings.leetcodeHandle && !userSettings.codeforcesHandle) {
      showPopup('Setup Required', 'Add your LeetCode or Codeforces handle in Settings first.', 'warning');
      setActiveTab('Settings'); return;
    }
    setLoading(true);
    try {
      const reqs = [];
      if (userSettings.codeforcesHandle) {
        reqs.push(
          fetch(`${API}/api/sync/codeforces?handle=${userSettings.codeforcesHandle}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(async r => {
            const data = await r.json();
            return { platform: 'Codeforces', ok: r.ok, data };
          })
        );
      }
      if (userSettings.leetcodeHandle) {
        reqs.push(
          fetch(`${API}/api/sync/leetcode`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle: userSettings.leetcodeHandle })
          }).then(async r => {
            const data = await r.json();
            if (data.lcStats) setLcStats(data.lcStats);
            return { platform: 'LeetCode', ok: r.ok, data };
          })
        );
      }

      const results = await Promise.allSettled(reqs);
      await fetchData();
      setLastSyncTime(new Date());

      const errors = [];
      results.forEach(res => {
        if (res.status === 'fulfilled') {
          if (!res.value.ok || res.value.data.error) {
            errors.push(`${res.value.platform}: ${res.value.data.error || 'Failed to fetch data'}`);
          }
        } else {
          errors.push('Network error fetching sync data');
        }
      });

      if (errors.length > 0) {
        showPopup('Sync Notice', errors.join(' | '), 'warning');
      } else {
        showPopup('Sync Complete!', 'Data updated successfully.', 'success');
      }
    } catch (err) {
      showPopup('Sync Failed', 'Check your internet connection.', 'error');
    } finally { setLoading(false); }
  };

  // ── Note update ──────────────────────────────────────────────────────────
  const handleUpdateNote = async (problemId, payload) => {
    try {
      const res  = await fetch(`${API}/api/notes/${problemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setProblems(prev => prev.map(p => p._id === problemId ? { ...p, ...data } : p));
        showPopup('Saved', 'Note saved successfully.', 'success');
        return true;
      } else {
        showPopup('Save Failed', data.msg || 'Could not save note.', 'error');
        return false;
      }
    } catch {
      showPopup('Error', 'Network error while saving.', 'error');
      return false;
    }
  };

  // ── Hint tier update ──────────────────────────────────────────────────────
  const handleUpdateHintTier = async (problemId, tier) => {
    try {
      const res = await fetch(`${API}/api/notes/${problemId}/hint-tier`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier })
      });
      const data = await res.json();
      if (res.ok) {
        setProblems(prev => prev.map(p => p._id === problemId ? { ...p, ...data } : p));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const streak      = calcStreak(problems, lcCalendar);
  const lcCount     = Math.max(lcStats?.total || 0, (problems || []).filter(p => !p.archived && p.platform === 'LeetCode').length);
  const cfCount     = (problems || []).filter(p => !p.archived && p.platform === 'Codeforces').length;
  const otherCount  = (problems || []).filter(p => !p.archived && p.platform !== 'LeetCode' && p.platform !== 'Codeforces').length;
  const totalSolved = lcCount + cfCount + otherCount;

  // Check for public profile route (standalone unauthenticated page)
  const isPublicRoute = window.location.hash.includes('/u/') || window.location.pathname.includes('/u/');
  if (isPublicRoute) {
    return <PublicProfileView />;
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!token) {
    return (
      <>
        <AuthView onAuth={handleAuth} loading={loading} error={authErr} />
        <Popup {...popup} onClose={closePopup} />
      </>
    );
  }

  // ── Render view ───────────────────────────────────────────────────────────
  const renderView = () => {
    switch (activeTab) {
      case 'Home':
        return <DashboardView problems={problems} streak={streak} lcStats={lcStats} totalSolved={totalSolved} cfRating={cfRating} cfRank={cfRank} token={token} onDataRefresh={fetchData} />;
      case 'Tracker':
        return <TrackerView problems={problems} lastSyncTime={lastSyncTime} onSync={handleSync} searchQuery={searchQuery} token={token} onDataRefresh={fetchData} />;
      case 'Roadmaps':
        return <RoadmapsView token={token} showPopup={showPopup} />;
      case 'Drill':
        return <DrillView token={token} showPopup={showPopup} onDataRefresh={fetchData} />;
      case 'Simulator':
        return <SimulatorView token={token} showPopup={showPopup} cfRating={cfRating} />;
      case 'Review':
        return <ReviewView token={token} showPopup={showPopup} onDataRefresh={fetchData} />;
      case 'Analytics':
        return <AnalyticsView problems={problems} lcStats={lcStats} lcCalendar={lcCalendar} />;
      case 'Notes':
        return <NotesView problems={problems} onUpdateNote={handleUpdateNote} onUpdateHintTier={handleUpdateHintTier} token={token} />;
      case 'Groups':
        return <GroupsView token={token} showPopup={showPopup} />;
      case 'Settings':
        return <SettingsView userSettings={userSettings} setUserSettings={setUserSettings} token={token} showPopup={showPopup} theme={theme} onThemeToggle={toggleTheme} />;
      case 'Compare':
        return <CompareView token={token} />;
      case 'Profile':
        return <ProfileView userSettings={userSettings} setUserSettings={setUserSettings} token={token} showPopup={showPopup} onDataRefresh={fetchData} user={user} totalSolved={totalSolved} lcStats={lcStats} problems={problems} streak={streak} />;
      default:
        return null;
    }
  };

  const handleNavChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="main-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* Mobile overlay */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleNavChange}
        user={user}
        onLogout={handleLogout}
        totalSolved={totalSolved}
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header
          onSync={handleSync}
          loading={loading}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          notifications={notifications}
          onMenuToggle={() => setSidebarOpen(v => !v)}
          minimal={activeTab === 'Notes'}
          theme={theme}
          onThemeToggle={toggleTheme}
        />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderView()}
        </main>
      </div>

      <Popup {...popup} onClose={closePopup} />
      <ToastContainer
        toasts={notifications.map(n => ({ id: n.id, title: 'Streak Warning', message: n.text, type: 'streak' }))}
        onCloseToast={id => setNotifications(prev => prev.filter(x => x.id !== id))}
      />
    </div>
  );
}