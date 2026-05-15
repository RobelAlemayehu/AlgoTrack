import React, { useState, useEffect } from 'react';
import { CheckCircle2, Flame, AlertCircle, Code, ExternalLink, Lightbulb, Tag, Star } from 'lucide-react';

function StatCard({ title, value, sub, subColor, icon, accent }) {
  return (
    <div className="glass glass-hover" style={{ borderRadius: 14, padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{title}</p>
        <p className="stat-value" style={{ color: 'var(--text-primary)', marginBottom: 6 }}>{value}</p>
        <p style={{ fontSize: 11, fontWeight: 600, color: subColor || 'var(--text-muted)' }}>{sub}</p>
      </div>
      <div style={{ padding: 10, borderRadius: 12, background: accent + '1a', color: accent, display: 'flex', flexShrink: 0 }}>{icon}</div>
    </div>
  );
}

function getDiffBadgeClass(d) {
  if (!d) return 'badge badge-unknown';
  const l = d.toLowerCase();
  if (l === 'easy') return 'badge badge-easy';
  if (l === 'medium') return 'badge badge-medium';
  if (l === 'hard') return 'badge badge-hard';
  const r = parseInt(d);
  if (!isNaN(r)) { if (r < 1200) return 'badge badge-easy'; if (r < 1900) return 'badge badge-medium'; return 'badge badge-hard'; }
  return 'badge badge-unknown';
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

export default function DashboardView({ problems, streak, lcStats, cfRating, cfRank, token }) {
  const [recommendations, setRecommendations] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  const safe = Array.isArray(problems) ? problems : [];
  const sorted = [...safe].sort((a, b) => new Date(b.syncedAt || b.createdAt) - new Date(a.syncedAt || a.createdAt));
  
  const lcCount = lcStats?.total || safe.filter(p => p.platform === 'LeetCode').length;
  const cfCount = safe.filter(p => p.platform === 'Codeforces').length;
  const reviewNeeded = safe.filter(p => p.status === 'Review').length;

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = safe.filter(p => new Date(p.syncedAt || p.createdAt) >= weekAgo).length;

  const recent = sorted.slice(0, 8);

  // Load recommendations
  useEffect(() => {
    if (!token || safe.length === 0) return;
    setRecLoading(true);
    fetch('https://algotrack-1.onrender.com/api/sync/recommend', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setRecommendations(d))
      .catch(() => {})
      .finally(() => setRecLoading(false));
  }, [token, safe.length]);

  const totalSolved = cfCount + lcCount;

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Your competitive programming at a glance</p>
        </div>
        {/* CF Rating badge */}
        {cfRating > 0 && (
          <div style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--blue-dim)', border: '1px solid rgba(59,130,246,0.2)', textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>CF Rating</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)' }}>{cfRating}</div>
            {cfRank && <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{cfRank}</div>}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid-stats-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard title="Total Solved" value={totalSolved} sub={`+${thisWeek} this week`} subColor="var(--emerald)" accent="#10B981" icon={<CheckCircle2 size={20} />} />
        <StatCard title="Current Streak" value={`${streak}d`} sub={streak > 0 ? 'Keep it up!' : 'Start today!'} subColor="var(--orange)" accent="#F97316" icon={<Flame size={20} />} />
        <StatCard title="Review Needed" value={reviewNeeded} sub={reviewNeeded === 0 ? 'All caught up!' : 'Problems to revisit'} subColor="var(--yellow)" accent="#F59E0B" icon={<AlertCircle size={20} />} />
      </div>

      {/* Platform breakdown row */}
      <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {[
          { label: 'LeetCode', count: lcCount, easy: lcStats?.easy, medium: lcStats?.medium, hard: lcStats?.hard, color: 'var(--orange)', bg: 'var(--orange-dim)' },
          { label: 'Codeforces', count: cfCount, rating: cfRating, rank: cfRank, color: 'var(--blue)', bg: 'var(--blue-dim)' },
        ].map(p => (
          <div key={p.label} className="glass" style={{ borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Code size={18} color={p.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: p.color }}>{p.count}</span>
              </div>
              {p.easy !== undefined ? (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  <span style={{ color: 'var(--emerald)' }}>{p.easy}E</span> · <span style={{ color: 'var(--yellow)' }}>{p.medium}M</span> · <span style={{ color: 'var(--red)' }}>{p.hard}H</span>
                </div>
              ) : (
                p.rating > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textTransform: 'capitalize' }}>Rating: {p.rating} · {p.rank}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main content: recent + sidebar */}
      <div className="grid-main" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>
        {/* Recent Activity */}
        <div className="glass" style={{ borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Activity</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{safe.length} total synced</span>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No problems yet — go to <strong>Settings</strong> and sync your accounts!
            </div>
          ) : recent.map((p, i) => (
            <div key={p._id || i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', borderRadius: 10, marginBottom: 6,
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
              transition: 'border-color 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: p.platform === 'LeetCode' ? 'var(--orange-dim)' : 'var(--blue-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: p.platform === 'LeetCode' ? 'var(--orange)' : 'var(--blue)'
                }}>
                  <Code size={13} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</div>
                  {(p.tags || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                      {(p.tags || []).slice(0, 2).map(t => (
                        <span key={t} style={{ fontSize: 9, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: 4, textTransform: 'capitalize' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={getDiffBadgeClass(p.difficulty)}>{p.difficulty || '—'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 48, textAlign: 'right' }}>{timeAgo(p.syncedAt || p.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Difficulty split */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="glass" style={{ borderRadius: 14, padding: '18px 20px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Difficulty Split</h2>
            {[
              { label: 'Easy', count: lcStats?.easy ?? safe.filter(p => p.difficulty?.toLowerCase() === 'easy').length, color: 'var(--emerald)' },
              { label: 'Medium', count: lcStats?.medium ?? safe.filter(p => p.difficulty?.toLowerCase() === 'medium').length, color: 'var(--yellow)' },
              { label: 'Hard', count: lcStats?.hard ?? safe.filter(p => p.difficulty?.toLowerCase() === 'hard').length, color: 'var(--red)' },
              { label: 'CF Rated', count: safe.filter(p => p.platform === 'Codeforces' && !isNaN(parseInt(p.difficulty))).length, color: 'var(--blue)' },
            ].map(d => {
              const pct = totalSolved ? Math.round((d.count / totalSolved) * 100) : 0;
              return (
                <div key={d.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{d.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {(recommendations?.cfRecommendations?.length > 0 || recommendations?.lcRecommendations?.length > 0) && (
        <div className="glass" style={{ borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Lightbulb size={16} color="var(--yellow)" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recommended Problems</h2>
            {recommendations.weakTags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                {recommendations.weakTags.slice(0, 3).map(t => (
                  <span key={t} className="badge badge-cf" style={{ fontSize: 10 }}><Tag size={8} /> {t}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {[...(recommendations.cfRecommendations || []).slice(0, 4), ...(recommendations.lcRecommendations || []).slice(0, 4)].map((rec, i) => (
              <a key={i} href={rec.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{rec.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className={rec.platform === 'LeetCode' ? 'badge badge-lc' : 'badge badge-cf'} style={{ fontSize: 9 }}>{rec.platform}</span>
                        {rec.rating && <span className="badge badge-medium" style={{ fontSize: 9 }}>{rec.rating}</span>}
                        {rec.difficulty && <span className={`badge badge-${rec.difficulty?.toLowerCase()}`} style={{ fontSize: 9 }}>{rec.difficulty}</span>}
                      </div>
                      {(rec.tags || []).length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {rec.tags.slice(0, 3).map(t => (
                            <span key={t} style={{ fontSize: 9, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: 3, textTransform: 'capitalize' }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ExternalLink size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {recLoading && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTop: '2px solid var(--indigo)', borderRadius: '50%' }} />
          Loading personalized recommendations…
        </div>
      )}
    </div>
  );
}
