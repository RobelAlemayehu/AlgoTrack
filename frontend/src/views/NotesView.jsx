import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Code, Edit3, Save, X, Clock, ChevronRight, FileText, Terminal, Zap } from 'lucide-react';

const TABS = ['Explanation', 'Code', 'Complexity'];

function getDiffClass(d) {
  if (!d) return 'badge badge-unknown';
  const l = d.toLowerCase();
  if (l === 'easy') return 'badge badge-easy';
  if (l === 'medium') return 'badge badge-medium';
  if (l === 'hard') return 'badge badge-hard';
  return 'badge badge-cf';
}

export default function NotesView({ problems, onUpdateNote }) {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('Explanation');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ explanation: '', code: '', timeComplexity: '', spaceComplexity: '' });

  const safe = Array.isArray(problems) ? problems : [];
  const sorted = [...safe].sort((a, b) => new Date(b.syncedAt || b.createdAt) - new Date(a.syncedAt || a.createdAt));

  const filtered = sorted.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.platform?.toLowerCase().includes(search.toLowerCase())
  );

  const selected = sorted.find(p => p._id === selectedId);

  useEffect(() => {
    if (!selectedId && safe.length > 0) setSelectedId(safe[0]._id);
  }, [safe]);

  useEffect(() => {
    if (selected) {
      const cx = selected.complexity || {};
      setForm({
        explanation: selected.explanation || '',
        code: selected.codeImplementation || selected.codeImplmentation || '',
        timeComplexity: typeof cx === 'object' ? (cx.time || '') : cx,
        spaceComplexity: typeof cx === 'object' ? (cx.space || '') : '',
      });
      setEditing(false);
    }
  }, [selectedId, selected]);

  const handleSave = async () => {
    if (!selected) return;
    const success = await onUpdateNote(selected._id, {
      explanation: form.explanation,
      codeImplementation: form.code,
      complexity: { time: form.timeComplexity, space: form.spaceComplexity },
      category: selected.category,
    });
    if (success) setEditing(false);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Problem list sidebar */}
      <div style={{
        width: 260, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card)', flexShrink: 0
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Problems</h2>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input-field"
              style={{ paddingLeft: 30, fontSize: 12, height: 34 }}
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              {safe.length === 0 ? 'Sync problems first' : 'No matches'}
            </div>
          ) : filtered.map(p => (
            <div
              key={p._id}
              onClick={() => setSelectedId(p._id)}
              style={{
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 3,
                background: selectedId === p._id ? 'var(--indigo-dim)' : 'transparent',
                border: `1px solid ${selectedId === p._id ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { if (selectedId !== p._id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { if (selectedId !== p._id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: selectedId === p._id ? 'var(--indigo-light)' : 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.platform}</span>
                <span className={getDiffClass(p.difficulty)} style={{ fontSize: 9, padding: '2px 6px' }}>{p.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>
        {selected ? (
          <>
            {/* Problem header */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selected.platform}</span>
                  <ChevronRight size={12} color="var(--text-muted)" />
                  <span className={getDiffClass(selected.difficulty)} style={{ fontSize: 10, padding: '2px 7px' }}>{selected.difficulty}</span>
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{selected.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Clock size={11} color="var(--text-muted)" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Updated {new Date(selected.updatedAt || selected.lastUpdated || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {editing ? (
                  <>
                    <button className="btn-ghost" onClick={() => setEditing(false)} style={{ fontSize: 12, padding: '7px 14px' }}>
                      <X size={13} /> Cancel
                    </button>
                    <button className="btn-primary" onClick={handleSave} style={{ fontSize: 12, padding: '7px 14px' }}>
                      <Save size={13} /> Save
                    </button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={() => setEditing(true)} style={{ fontSize: 12, padding: '7px 14px' }}>
                    <Edit3 size={13} /> Edit Note
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', padding: '0 24px' }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '12px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: 'none', color: tab === t ? 'var(--indigo-light)' : 'var(--text-muted)',
                  borderBottom: tab === t ? '2px solid var(--indigo)' : '2px solid transparent',
                  transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 6
                }}>
                  {t === 'Explanation' && <FileText size={13} />}
                  {t === 'Code' && <Terminal size={13} />}
                  {t === 'Complexity' && <Zap size={13} />}
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {tab === 'Explanation' && (
                editing ? (
                  <textarea
                    value={form.explanation}
                    onChange={e => setForm({ ...form, explanation: e.target.value })}
                    placeholder="Write your explanation, approach, and key insights here…"
                    style={{
                      width: '100%', height: 'calc(100vh - 280px)', background: 'var(--bg-card)',
                      border: '1px solid var(--border)', borderRadius: 12, padding: 16,
                      color: 'var(--text-primary)', fontSize: 14, fontFamily: 'Inter, sans-serif',
                      lineHeight: 1.7, outline: 'none', resize: 'none', transition: 'border-color 0.15s'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                ) : (
                  <div style={{ maxWidth: 760 }}>
                    {selected.explanation ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {selected.explanation}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                        <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                        <p style={{ fontSize: 14 }}>No explanation yet</p>
                        <p style={{ fontSize: 12, marginTop: 4 }}>Click "Edit Note" to add your approach and insights</p>
                      </div>
                    )}
                  </div>
                )
              )}

              {tab === 'Code' && (
                editing ? (
                  <textarea
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder="// Paste your solution code here…"
                    style={{
                      width: '100%', height: 'calc(100vh - 280px)', background: 'var(--bg-base)',
                      border: '1px solid var(--border)', borderRadius: 12, padding: 16,
                      color: '#a5f3fc', fontSize: 13, fontFamily: '"JetBrains Mono", monospace',
                      lineHeight: 1.6, outline: 'none', resize: 'none', transition: 'border-color 0.15s'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                ) : (
                  (selected.codeImplementation || selected.codeImplmentation) ? (
                    <pre className="code-block" style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
                      {selected.codeImplementation || selected.codeImplmentation}
                    </pre>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                      <Code size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                      <p style={{ fontSize: 14 }}>No code saved yet</p>
                      <p style={{ fontSize: 12, marginTop: 4 }}>Add your solution in edit mode</p>
                    </div>
                  )
                )
              )}

              {tab === 'Complexity' && (
                <div style={{ maxWidth: 500 }}>
                  {editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {[
                        { label: 'Time Complexity', key: 'timeComplexity', placeholder: 'e.g. O(N log N)' },
                        { label: 'Space Complexity', key: 'spaceComplexity', placeholder: 'e.g. O(N)' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{f.label}</label>
                          <input
                            className="input-field"
                            value={form[f.key]}
                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                            placeholder={f.placeholder}
                            style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14 }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { label: 'Time Complexity', value: typeof selected.complexity === 'object' ? selected.complexity?.time : selected.complexity },
                        { label: 'Space Complexity', value: typeof selected.complexity === 'object' ? selected.complexity?.space : '' },
                      ].map(c => (
                        <div key={c.label} className="glass" style={{ borderRadius: 12, padding: '16px 18px' }}>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{c.label}</p>
                          <p style={{ fontSize: 20, fontFamily: '"JetBrains Mono", monospace', color: c.value ? 'var(--indigo-light)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {c.value || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--indigo-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} color="var(--indigo-light)" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Select a problem</p>
            <p style={{ fontSize: 13 }}>Choose a problem from the sidebar to view or edit your notes</p>
          </div>
        )}
      </div>
    </div>
  );
}
