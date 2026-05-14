import React, { useState, useEffect } from 'react';
import './index.css';

import Popup        from './components/ui/Popup';
import Sidebar      from './components/layout/Sidebar';
import Header       from './components/layout/Header';

import AuthView      from './views/AuthView';
import DashboardView from './views/DashboardView';
import TrackerView   from './views/TrackerView';
import AnalyticsView from './views/AnalyticsView';
import NotesView     from './views/NotesView';
import SettingsView  from './views/SettingsView';
import CompareView   from './views/CompareView';

const API = 'http://localhost:5000';

function calcStreak(problems, lcCalendar) {
  // Build a set of active days from both CF problems and LC calendar
  const daySet = new Set();
  (problems || []).forEach(p => {
    const d = new Date(p.syncedAt || p.createdAt || 0);
    d.setHours(0, 0, 0, 0);
    daySet.add(d.getTime());
  });
  Object.keys(lcCalendar || {}).forEach(ts => {
    const d = new Date(parseInt(ts) * 1000);
    d.setHours(0, 0, 0, 0);
    daySet.add(d.getTime());
  });
  const sorted = [...daySet].sort((a, b) => b - a);
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < sorted.length; i++) {
    const exp = new Date(today); exp.setDate(exp.getDate() - i);
    if (sorted[i] === exp.getTime()) streak++;
    else break;
  }
  return streak;
}

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user,  setUser]  = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [authErr, setAuthErr] = useState('');

  // ── Nav / Search ──────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState('Home');
  const [searchQuery,  setSearchQuery]  = useState('');

  // ── Core data ─────────────────────────────────────────────────────────────
  const [problems,     setProblems]     = useState([]);
  const [userSettings, setUserSettings] = useState({ leetcodeHandle: '', codeforcesHandle: '' });
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [loading,      setLoading]      = useState(false);

  // ── LeetCode real data ────────────────────────────────────────────────────
  const [lcStats,    setLcStats]    = useState({});   // { easy, medium, hard, total, ranking }
  const [lcCalendar, setLcCalendar] = useState({});   // { "unixTs": count, ... }

  // ── Codeforces profile ────────────────────────────────────────────────────
  const [cfRating,   setCfRating]   = useState(0);
  const [cfMaxRating,setCfMaxRating]= useState(0);
  const [cfRank,     setCfRank]     = useState('');

  // ── Popup ─────────────────────────────────────────────────────────────────
  const [popup, setPopup] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const showPopup = (title, message, type = 'info') => setPopup({ isOpen: true, title, message, type });
  const closePopup = () => setPopup(p => ({ ...p, isOpen: false }));

  // ── Fetch all user data from backend ──────────────────────────────────────
  const fetchData = async (tok = token) => {
    if (!tok) return;
    try {
      const profRes = await fetch(`${API}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${tok}` }
      });
      if (!profRes.ok) return;
      const prof = await profRes.json();

      const handles = {
        leetcodeHandle:   prof.handles?.leetcode   || '',
        codeforcesHandle: prof.handles?.codeforces || ''
      };
      setUserSettings(handles);

      // Real LC data from profile
      if (prof.lcStats)    setLcStats(prof.lcStats);
      if (prof.lcCalendar) setLcCalendar(prof.lcCalendar);
      if (prof.cfRating)   setCfRating(prof.cfRating);
      if (prof.cfMaxRating)setCfMaxRating(prof.cfMaxRating);
      if (prof.cfRank)     setCfRank(prof.cfRank);

      if (handles.leetcodeHandle || handles.codeforcesHandle) {
        const probRes = await fetch(`${API}/api/sync/all`, {
          headers: { Authorization: `Bearer ${tok}` }
        });
        if (probRes.ok) {
          const data = await probRes.json();
          setProblems(Array.isArray(data) ? data : []);
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
      setAuthErr('Cannot connect to server. Make sure the backend is running on port 5000.');
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
      if (userSettings.codeforcesHandle) reqs.push(
        fetch(`${API}/api/sync/codeforces?handle=${userSettings.codeforcesHandle}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => {
          if (d.cfRating)    setCfRating(d.cfRating);
          if (d.cfMaxRating) setCfMaxRating(d.cfMaxRating);
          if (d.cfRank)      setCfRank(d.cfRank);
          return d;
        })
      );
      if (userSettings.leetcodeHandle) reqs.push(
        fetch(`${API}/api/sync/leetcode`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: userSettings.leetcodeHandle })
        }).then(r => r.json()).then(d => {
          if (d.lcStats)    setLcStats(d.lcStats);
          // Re-fetch profile to get updated calendar
          fetchData();
          return d;
        })
      );
      const results = await Promise.all(reqs);
      await fetchData();
      setLastSyncTime(new Date());
      const total = problems.length;
      showPopup('Sync Complete! 🎉', `Data updated successfully.`, 'success');
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

  // ── Derived ───────────────────────────────────────────────────────────────
  const streak      = calcStreak(problems, lcCalendar);
  const totalSolved = (lcStats?.total || problems.filter(p => p.platform === 'LeetCode').length)
                    + problems.filter(p => p.platform === 'Codeforces').length;

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
        return <DashboardView problems={problems} streak={streak} lcStats={lcStats} cfRating={cfRating} cfRank={cfRank} token={token} />;
      case 'Tracker':
        return <TrackerView problems={problems} lastSyncTime={lastSyncTime} onSync={handleSync} searchQuery={searchQuery} />;
      case 'Analytics':
        return <AnalyticsView problems={problems} lcStats={lcStats} lcCalendar={lcCalendar} />;
      case 'Notes':
        return <NotesView problems={problems} onUpdateNote={handleUpdateNote} />;
      case 'Settings':
        return <SettingsView userSettings={userSettings} setUserSettings={setUserSettings} token={token} showPopup={showPopup} />;
      case 'Compare':
        return <CompareView token={token} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        totalSolved={totalSolved}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab !== 'Notes' && (
          <Header
            onSync={handleSync}
            loading={loading}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
          />
        )}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderView()}
        </main>
      </div>

      <Popup {...popup} onClose={closePopup} />
    </div>
  );
}