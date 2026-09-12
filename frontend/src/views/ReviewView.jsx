import React, { useState, useEffect } from 'react';
import { RotateCw, CheckCircle2, AlertCircle, Clock, BookOpen, ChevronRight, Zap } from 'lucide-react';

const API = import.meta.env.VITE_API || 'https://algotrack-1.onrender.com';

export default function ReviewView({ token, showPopup, onDataRefresh }) {
  const [loading, setLoading] = useState(true);
  const [dueProblems, setDueProblems] = useState([]);
  const [totalInReview, setTotalInReview] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Keyboard shortcut listener (1: again, 2: hard, 3: good, 4: easy, Space: flip)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) return;
      if (!dueProblems[currentIndex] || ratingLoading) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(f => !f);
        setShowSolution(true);
      } else if (e.key === '1') {
        handleRate('again');
      } else if (e.key === '2') {
        handleRate('hard');
      } else if (e.key === '3') {
        handleRate('good');
      } else if (e.key === '4') {
        handleRate('easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, dueProblems, ratingLoading, isFlipped]);

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
        setIsFlipped(false);
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
            Anki-style flashcard queue · <span className="mono" style={{ color: 'var(--accent)' }}>{dueProblems.length}</span> due today of <span className="mono">{totalInReview}</span> tracked
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

          {/* Flashcard Container */}
          <div
            onClick={() => { setIsFlipped(!isFlipped); setShowSolution(true); }}
            style={{
              perspective: 1000, cursor: 'pointer', userSelect: 'none'
            }}
          >
            <div
              className="glass"
              style={{
                padding: '28px 24px', borderRadius: 10, minHeight: 260,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transition: 'transform 0.4s ease, border-color 0.2s',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                borderColor: isFlipped ? 'rgba(240,136,62,0.4)' : 'var(--border)'
              }}
            >
              {!isFlipped ? (
                /* Card Front (Problem statement & tags) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${currentProb.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`}>{currentProb.platform}</span>
                      <span className={getDifficultyClass(currentProb.difficulty)}>{currentProb.difficulty}</span>
                      {currentProb.category && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {currentProb.category}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Click or Space to Flip ↵</span>
                  </div>

                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>{currentProb.title}</h2>

                  {currentProb.tags && currentProb.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {currentProb.tags.map(t => (
                        <span key={t} style={{ fontSize: 11, background: 'var(--bg-muted)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <BookOpen size={15} style={{ color: 'var(--accent)' }} /> Click card or press [Spacebar] to reveal solution
                  </div>
                </div>
              ) : (
                /* Card Back (Solution, approach, and code) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, transform: 'rotateY(180deg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{currentProb.title} — Solution Notes</h3>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Click to Flip Back</span>
                  </div>

                  {currentProb.explanation ? (
                    <div>
                      <h4 style={{ fontSize: 11, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4 }}>Intuition & Strategy</h4>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, background: 'var(--bg-base)', padding: 10, borderRadius: 6, border: '1px solid var(--border)', whiteSpace: 'pre-wrap', maxHeight: 140, overflowY: 'auto' }}>
                        {currentProb.explanation}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No explanation notes saved for this problem yet.</p>
                  )}

                  {currentProb.codeImplementation && (
                    <div>
                      <h4 style={{ fontSize: 11, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4 }}>Code Solution</h4>
                      <pre className="code-block" style={{ maxHeight: 120, overflowY: 'auto', fontSize: 11 }}>{currentProb.codeImplementation}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Self-Rating buttons with Anki 1-4 shortcuts */}
          <div className="glass" style={{ borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span>Rate recall quality using buttons or keyboard shortcuts <kbd style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>1</kbd>–<kbd style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>4</kbd>:</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <button
                disabled={ratingLoading}
                onClick={(e) => { e.stopPropagation(); handleRate('again'); }}
                className="btn-ghost"
                style={{ flexDirection: 'column', padding: '10px 6px', borderColor: 'rgba(255,123,114,0.3)', color: 'var(--cf-red)' }}
              >
                <strong style={{ fontSize: 13 }}>[1] Again</strong>
                <span style={{ fontSize: 11, opacity: 0.8 }}>1d interval</span>
              </button>

              <button
                disabled={ratingLoading}
                onClick={(e) => { e.stopPropagation(); handleRate('hard'); }}
                className="btn-ghost"
                style={{ flexDirection: 'column', padding: '10px 6px', borderColor: 'rgba(255,217,61,0.3)', color: 'var(--lc-yellow)' }}
              >
                <strong style={{ fontSize: 13 }}>[2] Hard</strong>
                <span style={{ fontSize: 11, opacity: 0.8 }}>1d interval</span>
              </button>

              <button
                disabled={ratingLoading}
                onClick={(e) => { e.stopPropagation(); handleRate('good'); }}
                className="btn-ghost"
                style={{ flexDirection: 'column', padding: '10px 6px', borderColor: 'rgba(77,157,224,0.3)', color: 'var(--cf-blue)' }}
              >
                <strong style={{ fontSize: 13 }}>[3] Good</strong>
                <span style={{ fontSize: 11, opacity: 0.8 }}>6d interval</span>
              </button>

              <button
                disabled={ratingLoading}
                onClick={(e) => { e.stopPropagation(); handleRate('easy'); }}
                className="btn-ghost"
                style={{ flexDirection: 'column', padding: '10px 6px', borderColor: 'rgba(63,185,80,0.3)', color: 'var(--cf-green)' }}
              >
                <strong style={{ fontSize: 13 }}>[4] Easy</strong>
                <span style={{ fontSize: 11, opacity: 0.8 }}>14d+ interval</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
