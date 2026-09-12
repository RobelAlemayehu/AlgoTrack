import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Code, Edit3, Save, X, ChevronRight, FileText, Terminal, Zap, HelpCircle, ExternalLink, Tag, Lightbulb, CheckCircle2, Lock } from 'lucide-react';
import SimilarProblemsSection from '../components/SimilarProblemsSection';

const TABS = ['Explanation', 'Code', 'Complexity', 'Need Help? (Hints)'];

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

function getOfficialLink(problem) {
  if (!problem) return null;
  const p = problem;

  if (p.platform === 'Codeforces') {
    const rawId = String(p.problemId || '');
    const match = rawId.match(/^(\d+)[-/_]?([A-Z0-9]+)$/i);
    if (match) {
      const contestId = match[1];
      const index = match[2].toUpperCase();
      return {
        label: `Codeforces ${contestId}${index} Problem & Tutorial`,
        url: `https://codeforces.com/problemset/problem/${contestId}/${index}`
      };
    }
    return {
      label: 'Official Codeforces Problemset',
      url: 'https://codeforces.com/problemset'
    };
  } else if (p.platform === 'LeetCode') {
    const slug = (p.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return {
      label: `LeetCode ${p.title} Editorial`,
      url: `https://leetcode.com/problems/${slug}/editorial/`
    };
  }

  return null;
}

const TIER_RANKS = { none: 0, nudge: 1, approach: 2, solution: 3 };

export default function NotesView({ problems, onUpdateNote, onUpdateHintTier, token }) {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('Explanation');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ explanation: '', code: '', timeComplexity: '', spaceComplexity: '' });

  // Progressive Hint Local State
  const [revealedTier, setRevealedTier] = useState('none');

  const safe = Array.isArray(problems) ? problems : [];
  const sorted = [...safe].sort((a, b) => new Date(b.solvedAt || b.syncedAt || b.createdAt) - new Date(a.solvedAt || a.syncedAt || a.createdAt));

  const filtered = sorted.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.platform?.toLowerCase().includes(search.toLowerCase())
  );

  const selected = sorted.find(p => p._id === selectedId);

  useEffect(() => {
    if (!selectedId && safe.length > 0) setSelectedId(safe[0]._id);
  }, [safe.length]);

  useEffect(() => {
    if (selected) {
      const cx = selected.complexity || {};
      setForm({
        explanation: selected.explanation || '',
        code: selected.codeImplementation || selected.codeImplmentation || '',
        timeComplexity: typeof cx === 'object' ? (cx.time || '') : cx,
        spaceComplexity: typeof cx === 'object' ? (cx.space || '') : '',
      });
      setRevealedTier(selected.revealedHintTier || 'none');
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

  const handleReveal = async (targetTier) => {
    if (!selected) return;
    const currentRank = TIER_RANKS[revealedTier] || 0;
    const targetRank = TIER_RANKS[targetTier];

    if (targetRank > currentRank) {
      setRevealedTier(targetTier);
      if (onUpdateHintTier) {
        await onUpdateHintTier(selected._id, targetTier);
      }
    }
  };

  return (
    <div className="notes-layout" style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Problem list sidebar */}
      <div className="notes-sidebar" style={{
        width: 260, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface)', flexShrink: 0
      }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Problems ({safe.length})</h2>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input-field"
              style={{ paddingLeft: 28, fontSize: 12, height: 30 }}
              placeholder="Search problems…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              {safe.length === 0 ? 'Sync problems first' : 'No matches found'}
            </div>
          ) : filtered.map(p => (
            <div
              key={p._id}
              onClick={() => setSelectedId(p._id)}
              style={{
                padding: '8px 10px', borderRadius: 4, cursor: 'pointer', marginBottom: 2,
                background: selectedId === p._id ? 'var(--bg-muted)' : 'transparent',
                borderLeft: selectedId === p._id ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: selectedId === p._id ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`badge ${p.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`} style={{ fontSize: 9 }}>{p.platform}</span>
                <span className={getRatingClass(p.difficulty)} style={{ fontSize: 11 }}>{p.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor panel */}
      <div className="notes-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>
        {selected ? (
          <>
            {/* Problem header */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span className={`badge ${selected.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`}>{selected.platform}</span>
                  <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                  <span className={getRatingClass(selected.difficulty)} style={{ fontSize: 12 }}>{selected.difficulty}</span>
                  {selected.revealedHintTier && selected.revealedHintTier !== 'none' && (
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4, background: 'rgba(240, 136, 62, 0.15)', color: 'var(--accent)', border: '1px solid rgba(240, 136, 62, 0.3)' }}>
                      Hint Used: {selected.revealedHintTier.toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {editing ? (
                  <>
                    <button className="btn-ghost" onClick={() => setEditing(false)} style={{ fontSize: 12, padding: '6px 12px' }}>
                      <X size={12} /> Cancel
                    </button>
                    <button className="btn-primary" onClick={handleSave} style={{ fontSize: 12, padding: '6px 12px' }}>
                      <Save size={12} /> Save
                    </button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={() => setEditing(true)} style={{ fontSize: 12, padding: '6px 12px' }}>
                    <Edit3 size={12} /> Edit Note
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', padding: '0 20px' }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '10px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: 'none', color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6
                }}>
                  {t === 'Explanation' && <FileText size={12} />}
                  {t === 'Code' && <Terminal size={12} />}
                  {t === 'Complexity' && <Zap size={12} />}
                  {t === 'Need Help? (Hints)' && <HelpCircle size={12} style={{ color: 'var(--accent)' }} />}
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {tab === 'Explanation' && (
                editing ? (
                  <textarea
                    value={form.explanation}
                    onChange={e => setForm({ ...form, explanation: e.target.value })}
                    placeholder="Write your explanation, approach, and key insights here…"
                    className="input-field"
                    style={{
                      width: '100%', height: 'calc(100vh - 300px)',
                      padding: 14, fontSize: 13, lineHeight: 1.6, resize: 'none'
                    }}
                  />
                ) : (
                  <div style={{ maxWidth: 760 }}>
                    {selected.explanation ? (
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {selected.explanation}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                        <BookOpen size={36} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
                        <p style={{ fontSize: 13 }}>No explanation notes yet</p>
                        <p style={{ fontSize: 11, marginTop: 2 }}>Click "Edit Note" to add your approach and notes</p>
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
                    className="input-field"
                    style={{
                      width: '100%', height: 'calc(100vh - 300px)',
                      padding: 14, fontSize: 12, fontFamily: 'var(--font-mono)',
                      lineHeight: 1.6, resize: 'none', color: 'var(--cf-cyan)'
                    }}
                  />
                ) : (
                  (selected.codeImplementation || selected.codeImplmentation) ? (
                    <pre className="code-block" style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
                      {selected.codeImplementation || selected.codeImplmentation}
                    </pre>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                      <Code size={36} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
                      <p style={{ fontSize: 13 }}>No code saved yet</p>
                      <p style={{ fontSize: 11, marginTop: 2 }}>Add code in edit mode</p>
                    </div>
                  )
                )
              )}

              {tab === 'Complexity' && (
                <div style={{ maxWidth: 480 }}>
                  {editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: 'Time Complexity', key: 'timeComplexity', placeholder: 'e.g. O(N log N)' },
                        { label: 'Space Complexity', key: 'spaceComplexity', placeholder: 'e.g. O(N)' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>{f.label}</label>
                          <input
                            className="input-field"
                            value={form[f.key]}
                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                            placeholder={f.placeholder}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'Time Complexity', value: typeof selected.complexity === 'object' ? selected.complexity?.time : selected.complexity },
                        { label: 'Space Complexity', value: typeof selected.complexity === 'object' ? selected.complexity?.space : '' },
                      ].map(c => (
                        <div key={c.label} className="glass" style={{ borderRadius: 6, padding: '14px 16px' }}>
                          <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>{c.label}</p>
                          <p style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: c.value ? 'var(--cf-cyan)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {c.value || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'Need Help? (Hints)' && (
                <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Status Banner */}
                  <div className="glass" style={{ borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <HelpCircle size={18} style={{ color: 'var(--accent)' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Progressive Help System</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Step-by-step guidance. Click to reveal each tier intentionally.</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)', padding: '4px 10px', borderRadius: 6,
                      background: revealedTier === 'none' ? 'var(--bg-muted)' : 'rgba(240, 136, 62, 0.15)',
                      color: revealedTier === 'none' ? 'var(--text-muted)' : 'var(--accent)',
                      border: '1px solid var(--border)', fontWeight: 600
                    }}>
                      Current Reflection: {revealedTier.toUpperCase()}
                    </span>
                  </div>

                  {/* Tier 1: Nudge */}
                  <div className="glass" style={{ borderRadius: 8, padding: '16px 18px', borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag size={15} style={{ color: 'var(--accent)' }} />
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Tier 1: Nudge (Tag & Category Hints)</h3>
                      </div>
                      {TIER_RANKS[revealedTier] >= 1 ? (
                        <span style={{ fontSize: 11, color: 'var(--cf-green)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <CheckCircle2 size={13} /> Unlocked
                        </span>
                      ) : (
                        <button className="btn-primary" onClick={() => handleReveal('nudge')} style={{ fontSize: 11, padding: '4px 10px' }}>
                          Reveal Nudge
                        </button>
                      )}
                    </div>

                    {TIER_RANKS[revealedTier] >= 1 ? (
                      <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 6, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                        <div style={{ marginBottom: 6 }}>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Topic Tags: </span>
                          <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                            {Array.isArray(selected.tags) && selected.tags.length > 0 ? selected.tags.join(', ') : (selected.category || 'General DSA')}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Difficulty Rating: </span>
                          <span className={getRatingClass(selected.difficulty)} style={{ fontSize: 11 }}>{selected.difficulty}</span>
                        </div>
                        <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                          💡 Hint: Consider algorithms and data structures commonly used for {Array.isArray(selected.tags) && selected.tags.length > 0 ? selected.tags[0] : 'this category'}.
                        </p>
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click "Reveal Nudge" to view tag and category hints without seeing the full solution.</p>
                    )}
                  </div>

                  {/* Tier 2: Approach */}
                  <div className="glass" style={{ borderRadius: 8, padding: '16px 18px', borderLeft: '4px solid var(--cf-cyan)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Lightbulb size={15} style={{ color: 'var(--cf-cyan)' }} />
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Tier 2: Approach & Official Editorial</h3>
                      </div>
                      {TIER_RANKS[revealedTier] >= 2 ? (
                        <span style={{ fontSize: 11, color: 'var(--cf-green)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <CheckCircle2 size={13} /> Unlocked
                        </span>
                      ) : (
                        <button className="btn-primary" onClick={() => handleReveal('approach')} style={{ fontSize: 11, padding: '4px 10px' }}>
                          Reveal Approach
                        </button>
                      )}
                    </div>

                    {TIER_RANKS[revealedTier] >= 2 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 6 }}>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4 }}>Saved User Approach Notes:</div>
                          {selected.explanation ? (
                            <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.explanation}</p>
                          ) : (
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', italic: 'true' }}>No user approach note saved yet for this problem.</p>
                          )}
                        </div>

                        {/* Official Editorial Link */}
                        {getOfficialLink(selected) && (
                          <a
                            href={getOfficialLink(selected).url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
                              padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, width: 'fit-content',
                              color: 'var(--cf-cyan)'
                            }}
                          >
                            <ExternalLink size={14} /> {getOfficialLink(selected).label}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click "Reveal Approach" to view saved approach notes and official platform editorial link.</p>
                    )}
                  </div>

                  {/* Tier 3: Full Solution */}
                  <div className="glass" style={{ borderRadius: 8, padding: '16px 18px', borderLeft: '4px solid var(--cf-red)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Code size={15} style={{ color: 'var(--cf-red)' }} />
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Tier 3: Full Solution Code & Solution Link</h3>
                      </div>
                      {TIER_RANKS[revealedTier] >= 3 ? (
                        <span style={{ fontSize: 11, color: 'var(--cf-green)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <CheckCircle2 size={13} /> Unlocked
                        </span>
                      ) : (
                        <button className="btn-primary" onClick={() => handleReveal('solution')} style={{ fontSize: 11, padding: '4px 10px' }}>
                          Reveal Solution
                        </button>
                      )}
                    </div>

                    {TIER_RANKS[revealedTier] >= 3 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(selected.codeImplementation || selected.codeImplmentation) ? (
                          <pre className="code-block" style={{ maxHeight: 240, overflowY: 'auto' }}>
                            {selected.codeImplementation || selected.codeImplmentation}
                          </pre>
                        ) : (
                          <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                            No solution code saved yet in notes.
                          </div>
                        )}

                        {getOfficialLink(selected) && (
                          <a
                            href={getOfficialLink(selected).url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
                              padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, width: 'fit-content',
                              color: 'var(--accent)'
                            }}
                          >
                            <ExternalLink size={14} /> Open {selected.platform} Official Solution Page
                          </a>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click "Reveal Solution" to view full implementation code and official solution link.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Similar Problem Suggestions */}
              <SimilarProblemsSection problem={selected} token={token} />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', gap: 10 }}>
            <BookOpen size={32} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Select a problem</p>
            <p style={{ fontSize: 12 }}>Choose a problem from the left sidebar to view or edit notes</p>
          </div>
        )}
      </div>
    </div>
  );
}
