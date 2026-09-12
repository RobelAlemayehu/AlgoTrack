import React, { useState } from 'react';
import { X, Plus, Save } from 'lucide-react';

import CustomSelect from './ui/CustomSelect';

const API = import.meta.env.VITE_API || 'http://localhost:5000';
const PLATFORMS = ['LeetCode', 'Codeforces', 'AtCoder', 'CodeChef', 'HackerRank', 'Custom'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', '800', '1200', '1600', '2000'];

const platformOptions = PLATFORMS.map(p => ({ value: p, label: p }));
const difficultyOptions = DIFFICULTIES.map(d => ({ value: d, label: d }));

export default function ManualProblemModal({ isOpen, onClose, token, onDataRefresh }) {
  if (!isOpen) return null;

  const [form, setForm] = useState({
    title: '',
    platform: 'AtCoder',
    difficulty: 'Medium',
    tags: '',
    explanation: '',
    codeImplementation: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !token) return;
    setLoading(true);

    try {
      const tagList = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch(`${API}/api/sync/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title,
          platform: form.platform,
          difficulty: form.difficulty,
          tags: tagList,
          explanation: form.explanation,
          codeImplementation: form.codeImplementation
        })
      });

      if (res.ok) {
        onDataRefresh?.();
        onClose();
        setForm({ title: '', platform: 'AtCoder', difficulty: 'Medium', tags: '', explanation: '', codeImplementation: '' });
      }
    } catch (err) {
      console.error('Failed to create manual problem:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 16
    }}>
      <div className="animate-fade-in glass" style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 10, width: '100%', maxWidth: 580, overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)'
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} style={{ color: 'var(--accent)' }} /> Add Manual Problem Record
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PROBLEM TITLE *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. ABC 350 - Count Substrings"
              className="input-field"
              style={{ width: '100%', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PLATFORM</label>
              <CustomSelect
                value={form.platform}
                options={platformOptions}
                onChange={val => setForm(f => ({ ...f, platform: val }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>DIFFICULTY / RATING</label>
              <CustomSelect
                value={form.difficulty}
                options={difficultyOptions}
                onChange={val => setForm(f => ({ ...f, difficulty: val }))}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TAGS (comma separated)</label>
            <input
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. Dynamic Programming, Graphs, DP"
              className="input-field"
              style={{ width: '100%', fontSize: 12 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SOLUTION NOTES / INTUITION</label>
            <textarea
              value={form.explanation}
              onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
              placeholder="Key algorithm steps, state transitions..."
              className="input-field"
              rows={3}
              style={{ width: '100%', fontSize: 12, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>CODE IMPLEMENTATION</label>
            <textarea
              value={form.codeImplementation}
              onChange={e => setForm(f => ({ ...f, codeImplementation: e.target.value }))}
              placeholder="// Paste your solution code..."
              className="input-field"
              rows={4}
              style={{ width: '100%', fontSize: 11, fontFamily: 'var(--font-mono)', background: '#0D1117', color: '#E6EDE3' }}
            />
          </div>

          {/* Footer Controls */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose} style={{ fontSize: 12 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ fontSize: 12, gap: 6 }}>
              <Save size={13} /> {loading ? 'Saving...' : 'Add Problem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
