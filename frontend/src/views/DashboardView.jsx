import React, { useState, useEffect } from 'react';
import { CheckCircle2, Flame, AlertCircle, Code, ExternalLink, Lightbulb, Tag, Calendar, Trophy, Shield, Clock, ChevronRight, Target, Zap, Award, ShieldAlert, Crown, Swords, Edit2 } from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';

const BADGE_ICONS = {
  'first-ac': Target,
  '50-solved': Zap,
  '100-solved': Award,
  '200-solved': Flame,
  'expert-coder': ShieldAlert,
  'master-coder': Crown,
  'streak-7': Calendar,
  'streak-30': Trophy,
  'polyglot': Swords,
  Target, Zap, Award, Flame, ShieldAlert, Crown, Calendar, Trophy, Swords
};

const renderBadgeIcon = (b) => {
  const IconComp = BADGE_ICONS[b.iconKey] || BADGE_ICONS[b.id] || Trophy;
  return <IconComp size={14} style={{ color: 'var(--accent)' }} />;
};

const API = import.meta.env.VITE_API || 'https://algotrack-1.onrender.com';

function formatCountdown(targetTs) {
  const diff = Math.max(0, targetTs - Math.floor(Date.now() / 1000));
  const days = Math.floor(diff / 86400);
  const hrs = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getRatingClass(diff) {
  if (!diff) return 'badge-unknown';
  const num = Number(diff);
  if (!isNaN(num)) {
    if (num < 1200) return 'rating-gray';
    if (num < 1400) return 'rating-green';
    if (num < 1600) return 'rating-cyan';
    if (num < 1900) return 'rating-blue';
    if (num < 2100) return 'rating-violet';
    if (num < 2400) return 'rating-orange';
    return 'rating-red';
  }
  const lower = String(diff).toLowerCase();
  if (lower === 'easy') return 'badge-easy';
  if (lower === 'medium') return 'badge-medium';
  if (lower === 'hard') return 'badge-hard';
  return 'badge-unknown';
}

export default function DashboardView({ problems, streak, lcStats, cfRating, cfRank, token, onDataRefresh }) {
  const [recommendations, setRecommendations] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [contests, setContests] = useState([]);
  const [badges, setBadges] = useState([]);
  const [dueReviewCount, setDueReviewCount] = useState(0);
  const [userTarget, setUserTarget] = useState(5);
  const [editingTarget, setEditingTarget] = useState(false);
  const [lcCalendar, setLcCalendar] = useState(null);

  const safe = Array.isArray(problems) ? problems : [];
  const sorted = [...safe].sort((a, b) => new Date(b.solvedAt || b.syncedAt || b.createdAt) - new Date(a.solvedAt || a.syncedAt || a.createdAt));

  const lcCount = lcStats?.total || safe.filter(p => p.platform === 'LeetCode').length;
  const cfCount = safe.filter(p => p.platform === 'Codeforces').length;
  const totalSolved = cfCount + lcCount;

  // Load Profile goals & calendar
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/auth/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.goals?.weeklyTarget) setUserTarget(d.goals.weeklyTarget);
        if (d.lcCalendar) setLcCalendar(d.lcCalendar);
      })
      .catch(() => {});
  }, [token]);

  const handleSaveTarget = async (newVal) => {
    const val = Math.max(1, parseInt(newVal) || 5);
    setUserTarget(val);
    setEditingTarget(false);
    try {
      await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ goals: { weeklyTarget: val } })
      });
    } catch {}
  };

  // Calculate REAL solves in the last 7 days
  const weekAgoMs = Date.now() - (7 * 86400000);
  const cfThisWeek = safe.filter(p => {
    if (p.platform === 'Codeforces' && p.solvedAt) {
      return new Date(p.solvedAt).getTime() >= weekAgoMs;
    }
    return false;
  }).length;

  const lcThisWeek = Object.entries(lcCalendar || {}).reduce((acc, [ts, cnt]) => {
    const ms = Number(ts) * 1000;
    return (ms >= weekAgoMs && cnt > 0) ? acc + cnt : acc;
  }, 0);

  const thisWeekCount = cfThisWeek + lcThisWeek;
  const weeklyTarget = userTarget || 5;
  const weeklyPct = Math.min(100, Math.round((thisWeekCount / weeklyTarget) * 100));

  const recent = sorted.slice(0, 8);

  // Fetch Contests, Badges, & Due Reviews
  useEffect(() => {
    if (!token) return;

    fetch(`${API}/api/sync/contests`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setContests(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch(`${API}/api/sync/badges`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setBadges(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch(`${API}/api/review/due`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setDueReviewCount(d.dueCount || 0))
      .catch(() => {});
  }, [token]);

  // Load recommendations
  useEffect(() => {
    if (!token || safe.length === 0) return;
    setRecLoading(true);
    fetch(`${API}/api/sync/recommend`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setRecommendations(d))
      .catch(() => {})
      .finally(() => setRecLoading(false));
  }, [token, safe.length]);

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header Rail */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Competitive Programming Tracker &amp; Review Ledger</p>
        </div>
      </div>

      {/* 4-Stat Rail */}
      <div className="grid-stats-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="glass" style={{ borderRadius: 6, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>TOTAL SOLVED</p>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{totalSolved}</div>
        </div>
        <div className="glass" style={{ borderRadius: 6, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>LEETCODE</p>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{lcCount}</div>
        </div>
        <div className="glass" style={{ borderRadius: 6, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>CODEFORCES</p>
          <div className="stat-value" style={{ color: 'var(--cf-cyan)' }}>{cfCount}</div>
        </div>
        <div className="glass" style={{ borderRadius: 6, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>STREAK</p>
          <div className="stat-value" style={{ color: streak > 0 ? 'var(--cf-green)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Flame size={18} style={{ color: streak > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
            {streak}d
          </div>
        </div>
      </div>

      {/* Review Alert Banner */}
      {dueReviewCount > 0 && (
        <div className="glass" style={{ borderRadius: 6, padding: '12px 16px', background: 'var(--accent-dim)', borderColor: 'rgba(240,136,62,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={16} style={{ color: 'var(--accent)' }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{dueReviewCount} Problem{dueReviewCount === 1 ? '' : 's'} Due for Review Today</span>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Spaced-repetition queue ready for self-testing.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Recent Activity & Sidebar */}
      <div className="grid-main" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* Left Column: Recent Solved Activity */}
        <div className="glass" style={{ borderRadius: 8, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Solved Activity</h2>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{safe.length} total recorded</span>
          </div>

          {recent.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No problems synced yet. Click <strong>Sync Now</strong> in the top header to import your submissions.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Platform</th>
                  <th>Rating / Difficulty</th>
                  <th style={{ textAlign: 'right' }}>Solved</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(p => (
                  <tr key={p._id || p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</div>
                      {p.tags && p.tags.length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                          {p.tags.slice(0, 2).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${p.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`}>
                        {p.platform}
                      </span>
                    </td>
                    <td>
                      <span className={getRatingClass(p.difficulty)} style={{ fontSize: 12 }}>
                        {p.difficulty || 'Unrated'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {timeAgo(p.solvedAt || p.syncedAt || p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Column: Weekly Goal & Upcoming Contests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Weekly Goal Progress */}
          <div className="glass" style={{ borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Weekly Target</span>
                <button
                  onClick={() => setEditingTarget(!editingTarget)}
                  title="Change weekly target"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
                >
                  <Edit2 size={12} />
                </button>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{thisWeekCount} / {weeklyTarget}</span>
            </div>

            {editingTarget ? (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                <CustomSelect
                  value={userTarget}
                  options={[
                    { value: 3, label: 'Target: 3 problems/week' },
                    { value: 5, label: 'Target: 5 problems/week' },
                    { value: 7, label: 'Target: 7 problems/week' },
                    { value: 10, label: 'Target: 10 problems/week' },
                    { value: 15, label: 'Target: 15 problems/week' },
                    { value: 20, label: 'Target: 20 problems/week' }
                  ]}
                  onChange={val => handleSaveTarget(val)}
                />
                <button className="btn-ghost" onClick={() => setEditingTarget(false)} style={{ fontSize: 11, padding: '6px 10px', height: 30, flexShrink: 0 }}>Cancel</button>
              </div>
            ) : null}

            <div className="progress-bar" style={{ marginBottom: 8 }}>
              <div className="progress-fill" style={{ width: `${weeklyPct}%`, background: 'var(--accent)' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{weeklyPct}% target reached</span>
              <span>Reset in {7 - (new Date().getDay() || 7)}d</span>
            </div>
          </div>

          {/* Upcoming Contests */}
          <div className="glass" style={{ borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Calendar size={14} style={{ color: 'var(--cf-cyan)' }} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Upcoming Contests</h2>
            </div>

            {contests.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                No upcoming Codeforces contests found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {contests.slice(0, 4).map(c => (
                  <div key={c.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--cf-cyan)' }}>Starts in {formatCountdown(c.startTimeSeconds)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{Math.round(c.durationSeconds / 3600)}h duration</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Achievements / Badges Strip */}
          {badges.length > 0 && (
            <div className="glass" style={{ borderRadius: 8, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Trophy size={14} style={{ color: 'var(--accent)' }} />
                <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Earned Badges ({badges.length})</h2>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {badges.map(b => (
                  <div key={b.id} title={`${b.name}: ${b.description}`} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {renderBadgeIcon(b)}
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Recommendations */}
      {(recommendations?.cfRecommendations?.length > 0 || recommendations?.lcRecommendations?.length > 0) && (
        <div className="glass" style={{ borderRadius: 8, padding: '18px 20px', marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Lightbulb size={15} style={{ color: 'var(--lc-yellow)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recommended Practice Problems</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {[...(recommendations.cfRecommendations || []).slice(0, 4), ...(recommendations.lcRecommendations || []).slice(0, 4)].map((rec, i) => (
              <a key={i} href={rec.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--bg-base)', cursor: 'pointer', transition: 'border-color 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{rec.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span className={`badge ${rec.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`}>{rec.platform}</span>
                    <span className={getRatingClass(rec.rating || rec.difficulty)} style={{ fontSize: 11 }}>{rec.rating || rec.difficulty}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
