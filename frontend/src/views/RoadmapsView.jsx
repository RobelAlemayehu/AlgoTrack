import React, { useState, useEffect } from 'react';
import { Map, CheckCircle2, Clock, ExternalLink, Filter, ChevronLeft, ChevronRight, Compass, Sparkles, BookOpen } from 'lucide-react';

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

export default function RoadmapsView({ token, showPopup }) {
  const [loading, setLoading] = useState(true);
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmapSlug, setSelectedRoadmapSlug] = useState(null);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unsolved' | 'in_progress' | 'solved'
  const [actionLoading, setActionLoading] = useState({});

  const fetchRoadmapsList = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/roadmaps`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmaps(data.roadmaps || []);
        if (data.roadmaps?.length > 0 && !selectedRoadmapSlug) {
          setSelectedRoadmapSlug(data.roadmaps[0].slug);
        }
      }
    } catch (err) {
      console.error('Failed to fetch roadmaps list:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoadmapDetails = async (slug) => {
    if (!token || !slug) return;
    try {
      const res = await fetch(`${API}/api/roadmaps/${slug}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRoadmap(data.roadmap);
      }
    } catch (err) {
      console.error('Failed to fetch roadmap detail:', err);
    }
  };

  useEffect(() => {
    fetchRoadmapsList();
  }, [token]);

  useEffect(() => {
    if (selectedRoadmapSlug) {
      fetchRoadmapDetails(selectedRoadmapSlug);
    }
  }, [selectedRoadmapSlug, token]);

  const handleToggleInProgress = async (problemId, currentStatus) => {
    if (!token || !selectedRoadmapSlug) return;
    const newInProgress = currentStatus !== 'in_progress';
    setActionLoading(prev => ({ ...prev, [problemId]: true }));

    try {
      const res = await fetch(`${API}/api/roadmaps/${selectedRoadmapSlug}/toggle-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ problemId, inProgress: newInProgress })
      });

      if (res.ok) {
        fetchRoadmapDetails(selectedRoadmapSlug);
        fetchRoadmapsList();
        showPopup?.(
          newInProgress ? 'Marked In Progress' : 'Progress Removed',
          newInProgress ? `Added to active work queue` : `Removed from in-progress list`,
          'info'
        );
      }
    } catch (err) {
      console.error('Failed to toggle progress:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [problemId]: false }));
    }
  };

  if (loading && roadmaps.length === 0) {
    return (
      <div className="view-pad animate-fade-in" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 380, gap: 16 }}>
        <div className="spinner-glow-container">
          <div className="spinner-outer-ring" />
          <div className="spinner-inner-ring" />
          <Compass size={26} style={{ color: 'var(--accent)', zIndex: 2 }} />
        </div>
        <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Loading Curated Roadmaps…</p>
      </div>
    );
  }

  return (
    <div className="view-pad animate-fade-in" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Map size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Curated Topic Roadmaps</h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            Track progress against structured interview &amp; pattern lists matched to your synced problem ledger
          </p>
        </div>
      </div>

      {/* Roadmap List Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {roadmaps.map(rm => {
          const isSelected = selectedRoadmapSlug === rm.slug;
          return (
            <div
              key={rm._id}
              onClick={() => setSelectedRoadmapSlug(rm.slug)}
              className="glass"
              style={{
                borderRadius: 8,
                padding: 16,
                cursor: 'pointer',
                border: '1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)'),
                background: isSelected ? 'var(--bg-surface)' : 'var(--bg-base)',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(240,136,62,0.3)' }}>
                  {rm.category || 'Curated Classics'}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {rm.solvedCount} / {rm.totalProblems} ({rm.progressPercent}%)
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{rm.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{rm.description}</p>
              </div>

              {/* Progress Bar */}
              <div className="progress-bar" style={{ height: 6, background: 'var(--bg-muted)' }}>
                <div className="progress-fill" style={{ width: `${rm.progressPercent}%`, background: 'var(--accent)' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Roadmap Details */}
      {activeRoadmap && (
        <div className="glass" style={{ borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Detailed Header & Stats Rail */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{activeRoadmap.title}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{activeRoadmap.description}</p>
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Filter size={13} style={{ color: 'var(--text-muted)', marginRight: 2 }} />
              {[
                { id: 'all', label: `All (${activeRoadmap.totalProblems})` },
                { id: 'unsolved', label: `Unsolved (${activeRoadmap.unsolvedCount})` },
                { id: 'in_progress', label: `In Progress (${activeRoadmap.inProgressCount})` },
                { id: 'solved', label: `Solved (${activeRoadmap.solvedCount})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                    cursor: 'pointer', border: '1px solid ' + (statusFilter === f.id ? 'var(--accent)' : 'var(--border)'),
                    background: statusFilter === f.id ? 'var(--accent-dim)' : 'var(--bg-base)',
                    color: statusFilter === f.id ? 'var(--accent)' : 'var(--text-secondary)'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped Topic Categories */}
          {activeRoadmap.categories?.map(cat => {
            const filteredCatProbs = cat.problems.filter(p => {
              if (statusFilter === 'all') return true;
              return p.status === statusFilter;
            });

            if (filteredCatProbs.length === 0) return null;

            return (
              <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Category Title Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {cat.name}
                  </h3>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {cat.solvedCount} / {cat.totalCount} completed
                  </span>
                </div>

                {/* Problems Table Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredCatProbs.map(p => (
                    <div
                      key={p._id}
                      className="glass"
                      style={{
                        padding: '10px 14px',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        gap: 12,
                        background: p.status === 'solved' ? 'rgba(63,185,80,0.04)' : 'var(--bg-surface)',
                        border: '1px solid ' + (p.status === 'solved' ? 'rgba(63,185,80,0.25)' : (p.status === 'in_progress' ? 'rgba(240,136,62,0.4)' : 'var(--border)'))
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        {/* Status Icon */}
                        {p.status === 'solved' ? (
                          <CheckCircle2 size={16} style={{ color: 'var(--cf-green)', flexShrink: 0 }} />
                        ) : p.status === 'in_progress' ? (
                          <Clock size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', flexShrink: 0 }} />
                        )}

                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.title}
                        </span>

                        <span className={`badge ${p.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`} style={{ fontSize: 10 }}>
                          {p.platform === 'LeetCode' ? 'LC' : 'CF'}
                        </span>

                        <span className={getDifficultyClass(p.difficulty)} style={{ fontSize: 11 }}>
                          {p.difficulty}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Toggle In Progress button if not solved */}
                        {p.status !== 'solved' && (
                          <button
                            disabled={actionLoading[p.problemId]}
                            onClick={() => handleToggleInProgress(p.problemId, p.status)}
                            style={{
                              padding: '3px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid ' + (p.status === 'in_progress' ? 'rgba(240,136,62,0.5)' : 'var(--border)'),
                              background: p.status === 'in_progress' ? 'var(--accent-dim)' : 'var(--bg-base)',
                              color: p.status === 'in_progress' ? 'var(--accent)' : 'var(--text-secondary)'
                            }}
                          >
                            {p.status === 'in_progress' ? 'In Progress' : '+ Mark In Progress'}
                          </button>
                        )}

                        {/* Direct Link Out */}
                        {p.externalUrl && (
                          <a
                            href={p.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost"
                            style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            Solve <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
