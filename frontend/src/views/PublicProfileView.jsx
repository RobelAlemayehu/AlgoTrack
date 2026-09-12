import React, { useState, useEffect } from 'react';
import { Award, Flame, Calendar, Trophy, CheckCircle2, Eye, ExternalLink, Code2, ShieldCheck, Sparkles, Map } from 'lucide-react';

const API = import.meta.env.VITE_API || 'http://localhost:5000';

function getRankColor(rank) {
  if (!rank) return '#808080';
  const r = rank.toLowerCase();
  if (r.includes('candidate master')) return '#a0a';
  if (r.includes('master')) return '#ff8c00';
  if (r.includes('grandmaster')) return '#f00';
  if (r.includes('expert')) return '#0000ff';
  if (r.includes('specialist')) return '#03a89e';
  if (r.includes('pupil')) return '#008000';
  if (r.includes('newbie')) return '#808080';
  return 'var(--accent)';
}

export default function PublicProfileView({ slug: routeSlug }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  // Extract slug from URL hash (e.g. #/u/rovel_19) or prop
  const getSlugFromUrl = () => {
    if (routeSlug) return routeSlug;
    const hash = window.location.hash || '';
    const match = hash.match(/#\/u\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const pathMatch = window.location.pathname.match(/\/u\/([a-zA-Z0-9_-]+)/);
    return pathMatch ? pathMatch[1] : null;
  };

  const targetSlug = getSlugFromUrl();

  useEffect(() => {
    if (!targetSlug) {
      setError('No profile handle specified.');
      setLoading(false);
      return;
    }

    const fetchPublicProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/api/public/${encodeURIComponent(targetSlug)}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data.publicProfile);
        } else {
          setError('Public profile not found or set to private.');
        }
      } catch (err) {
        console.error('Fetch public profile error:', err);
        setError('Unable to load public profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [targetSlug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div className="spinner-glow-container">
          <div className="spinner-outer-ring" />
          <div className="spinner-inner-ring" />
          <Trophy size={26} style={{ color: 'var(--accent)', zIndex: 2 }} />
        </div>
        <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Loading Public Portfolio…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass" style={{ borderRadius: 12, padding: '40px 32px', textAlign: 'center', maxWidth: 440 }}>
          <ShieldCheck size={42} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Profile Unavailable</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
            {error || 'This user profile is either private or does not exist.'}
          </p>
          <a href="/" className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Return to AlgoTrack
          </a>
        </div>
      </div>
    );
  }

  const { username, cfRating, cfMaxRating, cfRank, handles, stats, badges, roadmapSummaries } = profile;
  const rankColor = getRankColor(cfRank);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', padding: '32px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Brand Banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Code2 size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>AlgoTrack</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4 }}>Public Portfolio</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <Eye size={14} style={{ color: 'var(--accent)' }} />
            <span>{stats.pageViews} Profile Views</span>
          </div>
        </div>

        {/* Profile Card Header */}
        <div className="glass" style={{ borderRadius: 12, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent) 0%, #ff5252 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', boxShadow: '0 4px 14px rgba(240,136,62,0.3)' }}>
              {username.substring(0, 2).toUpperCase()}
            </div>

            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{username}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                {cfRank && (
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: rankColor, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, border: `1px solid ${rankColor}44` }}>
                    {cfRank} ({cfRating} max {cfMaxRating})
                  </span>
                )}
                {handles.leetcode && (
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    LeetCode: @{handles.leetcode}
                  </span>
                )}
                {handles.codeforces && (
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Codeforces: @{handles.codeforces}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="glass" style={{ padding: '10px 16px', borderRadius: 8, textAlign: 'center', background: 'var(--bg-base)' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Current Streak</span>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Flame size={16} /> {stats.currentStreak}d
              </p>
            </div>

            <div className="glass" style={{ padding: '10px 16px', borderRadius: 8, textAlign: 'center', background: 'var(--bg-base)' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Max Streak</span>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--cf-green)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Trophy size={16} /> {stats.maxStreak}d
              </p>
            </div>
          </div>
        </div>

        {/* Aggregate Solved Stats Rail */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="glass" style={{ padding: 18, borderRadius: 10, background: 'var(--bg-surface)' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Total Distinct Solved</span>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>{stats.totalSolved}</p>
          </div>

          <div className="glass" style={{ padding: 18, borderRadius: 10, background: 'var(--bg-surface)' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>LeetCode Solved</span>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--cf-green)', marginTop: 4 }}>{stats.lcCount}</p>
          </div>

          <div className="glass" style={{ padding: 18, borderRadius: 10, background: 'var(--bg-surface)' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Codeforces Solved</span>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--cf-cyan)', marginTop: 4 }}>{stats.cfCount}</p>
          </div>

          <div className="glass" style={{ padding: 18, borderRadius: 10, background: 'var(--bg-surface)' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Badges Earned</span>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{badges.length}</p>
          </div>
        </div>

        {/* Roadmap Progress Section (If enabled) */}
        {roadmapSummaries && roadmapSummaries.length > 0 && (
          <div className="glass" style={{ borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Map size={18} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Topic Roadmap Progress</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {roadmapSummaries.map(rm => (
                <div key={rm.title} className="glass" style={{ padding: 14, borderRadius: 8, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                    <span>{rm.title}</span>
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{rm.solvedCount}/{rm.totalProblems} ({rm.percent}%)</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6, background: 'var(--bg-muted)' }}>
                    <div className="progress-fill" style={{ width: `${rm.percent}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges Collection */}
        {badges && badges.length > 0 && (
          <div className="glass" style={{ borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Earned Achievements</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {badges.map(b => (
                <div key={b.id || b.name} className="glass" style={{ padding: 12, borderRadius: 8, background: 'var(--bg-base)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{b.icon || '🏆'}</span>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</h3>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2 }}>{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 10, color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          Powered by <strong style={{ color: 'var(--text-primary)' }}>AlgoTrack</strong> • Verified Real Problem Ledger
        </div>
      </div>
    </div>
  );
}
