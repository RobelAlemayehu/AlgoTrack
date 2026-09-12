import React, { useState, useEffect } from 'react';
import { Target, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Zap, Flame, Award } from 'lucide-react';

const API = import.meta.env.VITE_API || 'http://localhost:5000';

function getDifficultyClass(d) {
  if (!d) return 'rating-gray';
  const num = parseInt(d);
  if (!isNaN(num)) {
    if (num < 1200) return 'rating-green';
    if (num < 1400) return 'rating-green';
    if (num < 1600) return 'rating-cyan';
    if (num < 1900) return 'rating-blue';
    if (num < 2100) return 'rating-violet';
    if (num < 2400) return 'rating-orange';
    return 'rating-red';
  }
  const lower = String(d).toLowerCase();
  if (lower === 'easy') return 'badge-easy';
  if (lower === 'medium') return 'badge-medium';
  if (lower === 'hard') return 'badge-hard';
  return 'badge-unknown';
}

export default function DrillView({ token, showPopup, onDataRefresh }) {
  const [loading, setLoading] = useState(true);
  const [drillData, setDrillData] = useState(null);
  const [stats, setStats] = useState({ drillsCompletedThisWeek: 0, totalDrillsCompleted: 0 });
  const [completingMap, setCompletingMap] = useState({});

  const fetchDrills = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/drills/weak-topics?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDrillData(data);
      }

      const statsRes = await fetch(`${API}/api/drills/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }
    } catch (err) {
      console.error('Failed to fetch drill data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrills();
  }, [token]);

  const handleCompleteDrill = async (problem) => {
    if (!token) return;
    setCompletingMap(prev => ({ ...prev, [problem.problemId]: true }));
    try {
      const res = await fetch(`${API}/api/drills/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          problemId: problem.problemId,
          title: problem.title,
          platform: problem.platform,
          tag: problem.weakTag,
          difficulty: problem.difficulty
        })
      });

      if (res.ok) {
        showPopup?.('Drill Completed!', `Recorded drill completion for ${problem.title}`, 'success');
        fetchDrills();
        onDataRefresh?.();
      }
    } catch (err) {
      console.error('Failed to complete drill:', err);
    } finally {
      setCompletingMap(prev => ({ ...prev, [problem.problemId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="view-pad animate-fade-in" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 380, gap: 16 }}>
        <div className="spinner-glow-container">
          <div className="spinner-outer-ring" />
          <div className="spinner-inner-ring" />
          <Target size={26} style={{ color: 'var(--accent)', zIndex: 2 }} />
        </div>
        <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Analyzing weak topic metrics &amp; building drill set…</p>
      </div>
    );
  }

  if (!drillData?.hasEnoughData) {
    return (
      <div className="view-pad animate-fade-in" style={{ padding: '24px 28px', maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <Target size={20} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Weak-Topic Drill Mode</h1>
        </div>

        <div className="glass" style={{ padding: '40px 24px', textAlign: 'center', borderRadius: 8 }}>
          <AlertCircle size={36} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Not Enough Data Yet</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            {drillData?.message || 'Solve at least 5 problems across different topics to unlock your personalized Weak-Topic Drills.'}
          </p>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '4px 12px', borderRadius: 4, border: '1px solid rgba(240,136,62,0.3)' }}>
            Current Synced Problems: {drillData?.totalProblemsSynced || 0} / 5 Required
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="view-pad animate-fade-in" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header rail */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Weak-Topic Drill Mode</h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            Targeted daily practice generated from your normalized topic performance metrics
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Stat badge */}
          <div className="glass" style={{ padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              Drills Completed This Week: <strong style={{ color: 'var(--accent)' }}>{stats.drillsCompletedThisWeek}</strong>
            </span>
          </div>

          <button className="btn-primary" onClick={fetchDrills} style={{ fontSize: 12, gap: 6 }}>
            <RefreshCw size={13} /> Regenerate Drill Set
          </button>
        </div>
      </div>

      {/* Weak Tags Identified & Reason Cards */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
          Top 3 Identified Weak Tags &amp; Diagnosis
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {drillData.weakTags?.map((wt, idx) => (
            <div
              key={wt.tag}
              className="glass"
              style={{
                borderRadius: 8,
                padding: 14,
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                  #{idx + 1} WEAK TOPIC
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {wt.solved} / {wt.total} Solved ({wt.ratePercent}%)
                </span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{wt.tag}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{wt.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Curated Drill Problem Set */}
      <div className="glass" style={{ borderRadius: 8, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Curated Drill Practice Set
          </h2>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {drillData.drillProblems?.length || 0} Recommended Problems
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {drillData.drillProblems?.map(p => (
            <div
              key={p.problemId}
              className="glass"
              style={{
                borderRadius: 6,
                padding: 14,
                border: '1px solid var(--border)',
                background: 'var(--bg-base)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(240,136,62,0.3)' }}>
                    Tag: {p.weakTag}
                  </span>
                  <span className={`badge ${p.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`} style={{ fontSize: 10 }}>
                    {p.platform === 'LeetCode' ? 'LC' : 'CF'}
                  </span>
                </div>

                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.title}</h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={getDifficultyClass(p.difficulty)} style={{ fontSize: 11 }}>
                    {p.difficulty}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                  style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Solve <ExternalLink size={11} />
                </a>

                <button
                  disabled={completingMap[p.problemId]}
                  onClick={() => handleCompleteDrill(p)}
                  className="btn-primary"
                  style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
                >
                  <CheckCircle2 size={12} /> Mark Drill Done
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
