import React, { useState, useEffect } from 'react';
import { CheckCircle2, Flame, AlertCircle, Code, ExternalLink, Lightbulb, Tag, Calendar, Trophy, Shield, Clock, ChevronRight, Target, Zap, Award, ShieldAlert, Crown, Swords } from 'lucide-react';

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
  if (!diff) return 'rating-gray';
  const num = parseInt(diff);
  if (!isNaN(num)) {
    if (num < 1200) return 'rating-green';
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

  const safe = Array.isArray(problems) ? problems : [];
  const sorted = [...safe].sort((a, b) => new Date(b.syncedAt || b.createdAt) - new Date(a.syncedAt || a.createdAt));

  const lcCount = lcStats?.total || safe.filter(p => p.platform === 'LeetCode').length;
  const cfCount = safe.filter(p => p.platform === 'Codeforces').length;
  const totalSolved = cfCount + lcCount;

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekCount = safe.filter(p => new Date(p.syncedAt || p.createdAt) >= weekAgo).length;

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

  const weeklyTarget = 5;
  const weeklyPct = Math.min(100, Math.round((thisWeekCount / weeklyTarget) * 100));

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header Rail */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Dashboard
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Competitive Programming Tracker & Review Ledger
          </div>
        </div>

        {/* CF Rating Badge if user has one */}
        {cfRating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>CF RATING</span>
            <span className={getRatingClass(cfRating.toString())} style={{ fontSize: 16 }}>{cfRating}</span>
            {cfRank && <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>({cfRank})</span>}
          </div>
        )}
      </div>

      {/* Horizontal Stat Rail — Dense, clean 1-strip design */}
      <div className="glass" style={{ padding: '14px 18px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>TOTAL SOLVED</div>
            <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{totalSolved}</div>
          </div>
          <div style={{ height: 28, width: 1, background: 'var(--border)' }} />
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>LEETCODE</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{lcCount}</div>
          </div>
          <div style={{ height: 28, width: 1, background: 'var(--border)' }} />
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>CODEFORCES</div>
            <div className="stat-value" style={{ color: 'var(--cf-cyan)' }}>{cfCount}</div>
          </div>
          <div style={{ height: 28, width: 1, background: 'var(--border)' }} />
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>STREAK</div>
            <div className="stat-value" style={{ color: streak > 0 ? 'var(--cf-green)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={18} style={{ color: streak > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
              {streak}d
            </div>
          </div>
        </div>

        {/* Review Queue alert */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>REVIEWS DUE</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: dueReviewCount > 0 ? 'var(--accent)' : 'var(--cf-green)', fontFamily: 'var(--font-mono)' }}>
              {dueReviewCount > 0 ? `${dueReviewCount} problem${dueReviewCount > 1 ? 's' : ''}` : 'All caught up!'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout: Main Activity + Contests/Goals */}
      <div className="grid-main" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>
        
        {/* Left Column: Recent Activity Ledger */}
        <div className="glass" style={{ borderRadius: 8, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Solved Activity</h2>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{safe.length} total recorded</span>
          </div>

          {recent.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No problems synced yet. Click <strong>Sync Now</strong> in the top header to import your submissions.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Problem</th>
                  <th>Platform</th>
                  <th>Difficulty / Rating</th>
                  <th style={{ textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p, i) => (
                  <tr key={p._id || i}>
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
                      {timeAgo(p.syncedAt || p.createdAt)}
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
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Weekly Target</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{thisWeekCount} / {weeklyTarget}</span>
            </div>
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
