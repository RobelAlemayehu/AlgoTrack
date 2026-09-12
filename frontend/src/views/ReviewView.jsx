import React, { useState, useEffect } from 'react';
import { RotateCw, CheckCircle2, AlertCircle, Clock, BookOpen, ChevronRight, Zap } from 'lucide-react';

const API = import.meta.env.VITE_API || 'https://algotrack-1.onrender.com';

export default function ReviewView({ token, showPopup, onDataRefresh }) {
  const [loading, setLoading] = useState(true);
  const [dueProblems, setDueProblems] = useState([]);
  const [totalInReview, setTotalInReview] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  const fetchDue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/review/due`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDueProblems(data.dueProblems || []);
        setTotalInReview(data.totalInReview || 0);
      }
    } catch (err) {
      console.error('Failed to fetch due reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDue();
  }, [token]);

  const handleRate = async (rating) => {
    if (!dueProblems[currentIndex]) return;
    const probId = dueProblems[currentIndex]._id;
    setRatingLoading(true);

    try {
      const res = await fetch(`${API}/api/review/${probId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating })
      });

      if (res.ok) {
        showPopup?.('Review Saved', `Rescheduled based on '${rating}' rating.`, 'success');
        setShowSolution(false);
        if (currentIndex < dueProblems.length - 1) {
          setCurrentIndex(c => c + 1);
        } else {
          // Finished batch
          fetchDue();
          setCurrentIndex(0);
        }
        onDataRefresh?.();
      } else {
        showPopup?.('Error', 'Failed to save review rating', 'error');
      }
    } catch (err) {
      showPopup?.('Error', err.message, 'error');
    } finally {
      setRatingLoading(false);
    }
  };

  const currentProb = dueProblems[currentIndex];

  const getDifficultyClass = (diff) => {
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
  };

  if (loading) {
    return (
      <div className="view-pad animate-fade-in" style={{ padding: '28px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <RotateCw className="animate-spin" size={24} style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="view-pad animate-fade-in" style={{ padding: '28px 32px', maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header rail */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Spaced Repetition Review</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            SM-2 memory algorithm queue · <span className="mono" style={{ color: 'var(--accent)' }}>{dueProblems.length}</span> due today of <span className="mono">{totalInReview}</span> tracked
          </p>
        </div>
        <button className="btn-ghost" onClick={fetchDue} style={{ fontSize: 12 }}>
          <RotateCw size={12} /> Refresh
        </button>
      </div>

      {dueProblems.length === 0 ? (
        <div className="glass" style={{ padding: '40px 24px', textAlign: 'center', borderRadius: 8 }}>
          <CheckCircle2 size={36} style={{ color: 'var(--cf-green)', marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>All Reviews Completed!</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px auto' }}>
            You have no problems due for review right now. Enable Spaced Repetition on problems from the DSA Tracker or Notes view to schedule them.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Problem {currentIndex + 1} of {dueProblems.length}</span>
            <span className="mono">{Math.round(((currentIndex + 1) / dueProblems.length) * 100)}% complete</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((currentIndex + 1) / dueProblems.length) * 100}%`, background: 'var(--accent)' }} />
          </div>

          {/* Review Card */}
          <div className="glass" style={{ padding: '24px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className={`badge ${currentProb.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`}>{currentProb.platform}</span>
                  <span className={getDifficultyClass(currentProb.difficulty)}>{currentProb.difficulty}</span>
                  {currentProb.category && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {currentProb.category}</span>}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{currentProb.title}</h2>
              </div>
            </div>

            {/* Tags */}
            {currentProb.tags && currentProb.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {currentProb.tags.map(t => (
                  <span key={t} style={{ fontSize: 11, background: 'var(--bg-muted)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Question notes / toggle solution */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
              {!showSolution ? (
                <button
                  className="btn-ghost"
                  onClick={() => setShowSolution(true)}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 13, borderColor: 'var(--border-hover)' }}
                >
                  <BookOpen size={14} /> Show Explanation & Code Implementation
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="animate-fade-in">
                  {currentProb.explanation ? (
                    <div>
                      <h4 style={{ fontSize: 12, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>Explanation & Strategy</h4>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, background: 'var(--bg-base)', padding: 12, borderRadius: 6, border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
                        {currentProb.explanation}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', italic: 'true' }}>No explanation notes saved for this problem yet.</p>
                  )}

                  {currentProb.codeImplementation && (
                    <div>
                      <h4 style={{ fontSize: 12, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>Code Implementation</h4>
                      <pre className="code-block">{currentProb.codeImplementation}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Self-Rating buttons */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center' }}>
                Rate how easily you recalled the solution approach:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <button
                  disabled={ratingLoading}
                  onClick={() => handleRate('again')}
                  className="btn-ghost"
                  style={{ flexDirection: 'column', padding: '10px 6px', borderColor: 'rgba(255,123,114,0.3)', color: 'var(--cf-red)' }}
                >
                  <strong style={{ fontSize: 13 }}>Again</strong>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>1d</span>
                </button>

                <button
                  disabled={ratingLoading}
                  onClick={() => handleRate('hard')}
                  className="btn-ghost"
                  style={{ flexDirection: 'column', padding: '10px 6px', borderColor: 'rgba(255,217,61,0.3)', color: 'var(--lc-yellow)' }}
                >
                  <strong style={{ fontSize: 13 }}>Hard</strong>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>1d</span>
                </button>

                <button
                  disabled={ratingLoading}
                  onClick={() => handleRate('good')}
                  className="btn-ghost"
                  style={{ flexDirection: 'column', padding: '10px 6px', borderColor: 'rgba(77,157,224,0.3)', color: 'var(--cf-blue)' }}
                >
                  <strong style={{ fontSize: 13 }}>Good</strong>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>6d</span>
                </button>

                <button
                  disabled={ratingLoading}
                  onClick={() => handleRate('easy')}
                  className="btn-ghost"
                  style={{ flexDirection: 'column', padding: '10px 6px', borderColor: 'rgba(63,185,80,0.3)', color: 'var(--cf-green)' }}
                >
                  <strong style={{ fontSize: 13 }}>Easy</strong>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>14d+</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
