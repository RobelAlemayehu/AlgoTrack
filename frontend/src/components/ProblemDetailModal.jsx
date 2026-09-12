import React, { useState, useEffect } from 'react';
import { X, Code, FileText, Terminal, Repeat, Clock, ExternalLink, Save, CheckCircle2, Play, Pause, RotateCcw } from 'lucide-react';

const API = import.meta.env.VITE_API || 'https://algotrack-1.onrender.com';

function getRatingClass(d) {
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

export default function ProblemDetailModal({ problem, isOpen, onClose, token, onDataRefresh }) {
  if (!isOpen || !problem) return null;

  const [activeTab, setActiveTab] = useState('Overview');
  const [form, setForm] = useState({
    explanation: problem.explanation || '',
    codeImplementation: problem.codeImplementation || problem.codeImplmentation || '',
    timeComplexity: typeof problem.complexity === 'object' ? (problem.complexity?.time || '') : (problem.complexity || ''),
    spaceComplexity: typeof problem.complexity === 'object' ? (problem.complexity?.space || '') : ''
  });
  const [saving, setSaving] = useState(false);
  const [reviewState, setReviewState] = useState(problem.review?.enabled || false);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSaveNotes = async () => {
    if (!token || !problem._id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/notes/${problem._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          explanation: form.explanation,
          codeImplementation: form.codeImplementation,
          complexity: { time: form.timeComplexity, space: form.spaceComplexity }
        })
      });
      if (res.ok) {
        onDataRefresh?.();
      }
    } catch (err) {
      console.error('Failed to save problem details:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReview = async () => {
    if (!token || !problem._id) return;
    const newState = !reviewState;
    setReviewState(newState);
    try {
      const res = await fetch(`${API}/api/review/${problem._id}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: newState })
      });
      if (res.ok) {
        onDataRefresh?.();
      }
    } catch (err) {
      console.error('Failed to toggle review:', err);
    }
  };

  const problemUrl = problem.platform === 'LeetCode'
    ? `https://leetcode.com/problems/${problem.problemId || ''}/`
    : (problem.platform === 'Codeforces' && problem.problemId
      ? `https://codeforces.com/problemset/problem/${problem.problemId.replace('CF-', '').replace(/([0-9]+)([A-Z0-9]+)/, '$1/$2')}`
      : null);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 16
    }}>
      <div className="animate-fade-in glass" style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 10, width: '100%', maxWidth: 740, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge ${problem.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`}>
                {problem.platform}
              </span>
              <span className={getRatingClass(problem.difficulty)} style={{ fontSize: 12 }}>
                {problem.difficulty || 'Medium'}
              </span>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{problem.title}</h2>
              {problemUrl && (
                <a href={problemUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            {problem.tags && problem.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {problem.tags.map(t => (
                  <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Timer Bar & Action Rail */}
        <div style={{
          padding: '10px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          {/* Focus Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
              Session Timer: {formatTimer(timerSeconds)}
            </span>
            <button className="btn-ghost" onClick={() => setTimerRunning(!timerRunning)} style={{ padding: '3px 8px', fontSize: 11 }}>
              {timerRunning ? <Pause size={12} /> : <Play size={12} />} {timerRunning ? 'Pause' : 'Start'}
            </button>
            <button className="btn-ghost" onClick={() => { setTimerRunning(false); setTimerSeconds(0); }} style={{ padding: '3px 6px', fontSize: 11 }}>
              <RotateCcw size={12} />
            </button>
          </div>

          {/* SM-2 Review Toggle */}
          <button
            onClick={handleToggleReview}
            style={{
              background: reviewState ? 'var(--accent-dim)' : 'var(--bg-base)',
              border: `1px solid ${reviewState ? 'rgba(240,136,62,0.4)' : 'var(--border)'}`,
              color: reviewState ? 'var(--accent)' : 'var(--text-muted)',
              borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
              fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: 6
            }}
          >
            <Repeat size={12} /> {reviewState ? 'Spaced Review Active' : '+ Add to Spaced Review'}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)', padding: '0 20px' }}>
          {['Overview', 'My Notes', 'Code Implementation', 'Complexity'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '10px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none', borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === t ? 'var(--accent)' : 'var(--text-secondary)', transition: 'all 0.15s'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeTab === 'Overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="glass" style={{ borderRadius: 6, padding: 14 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>PROBLEM SUMMARY</h4>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {problem.explanation || 'No detailed solution notes added yet. Switch to "My Notes" tab to add your approach and solution breakdown.'}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass" style={{ borderRadius: 6, padding: 12 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>TIME COMPLEXITY</span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                    {form.timeComplexity || 'Not specified'}
                  </div>
                </div>
                <div className="glass" style={{ borderRadius: 6, padding: 12 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>SPACE COMPLEXITY</span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                    {form.spaceComplexity || 'Not specified'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'My Notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                value={form.explanation}
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                placeholder="Document your intuition, key algorithms, edge cases, and approach..."
                className="input-field"
                rows={8}
                style={{ fontSize: 13, lineHeight: 1.5, fontFamily: 'var(--font-sans)', width: '100%', resize: 'vertical' }}
              />
            </div>
          )}

          {activeTab === 'Code Implementation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                value={form.codeImplementation}
                onChange={e => setForm(f => ({ ...f, codeImplementation: e.target.value }))}
                placeholder="// Paste your clean solution code here..."
                className="input-field"
                rows={10}
                style={{ fontSize: 12, fontFamily: 'var(--font-mono)', width: '100%', resize: 'vertical', background: '#0D1117', color: '#E6EDE3' }}
              />
            </div>
          )}

          {activeTab === 'Complexity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TIME COMPLEXITY (e.g. O(N log N))</label>
                <input
                  value={form.timeComplexity}
                  onChange={e => setForm(f => ({ ...f, timeComplexity: e.target.value }))}
                  placeholder="e.g. O(N log N)"
                  className="input-field"
                  style={{ width: '100%', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SPACE COMPLEXITY (e.g. O(1))</label>
                <input
                  value={form.spaceComplexity}
                  onChange={e => setForm(f => ({ ...f, spaceComplexity: e.target.value }))}
                  placeholder="e.g. O(1)"
                  className="input-field"
                  style={{ width: '100%', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-base)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 12 }}>
            Close
          </button>
          <button className="btn-primary" onClick={handleSaveNotes} disabled={saving} style={{ fontSize: 12, gap: 6 }}>
            <Save size={13} /> {saving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}
