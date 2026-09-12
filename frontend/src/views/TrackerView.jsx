import React, { useState, useMemo } from 'react';
import { RefreshCw, Code, Filter, ChevronLeft, ChevronRight, Zap, Repeat, Plus, LayoutGrid, List } from 'lucide-react';
import ProblemDetailModal from '../components/ProblemDetailModal';
import ManualProblemModal from '../components/ManualProblemModal';
import KanbanBoard from '../components/KanbanBoard';

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

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ITEMS_PER_PAGE = 15;
const PLATFORMS    = ['All', 'LeetCode', 'Codeforces'];
const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

export default function TrackerView({ problems, lastSyncTime, onSync, searchQuery, token, onDataRefresh }) {
  const [viewMode,   setViewMode]   = useState('table'); // 'table' | 'kanban'
  const [platform,   setPlatform]   = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [tagFilter,  setTagFilter]  = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: 'solvedAt', dir: 'desc' });
  const [detailProblem, setDetailProblem] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);

  const safe = Array.isArray(problems) ? problems : [];

  const filtered = useMemo(() => {
    let list = [...safe];

    if (platform !== 'All') list = list.filter(p => p.platform === platform);

    if (difficulty !== 'All') {
      if      (difficulty === 'Easy')   list = list.filter(p => p.difficulty?.toLowerCase() === 'easy'   || (parseInt(p.difficulty) > 0  && parseInt(p.difficulty) < 1200));
      else if (difficulty === 'Medium') list = list.filter(p => p.difficulty?.toLowerCase() === 'medium' || (parseInt(p.difficulty) >= 1200 && parseInt(p.difficulty) < 1900));
      else if (difficulty === 'Hard')   list = list.filter(p => p.difficulty?.toLowerCase() === 'hard'   ||  parseInt(p.difficulty) >= 1900);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.platform?.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (tagFilter.trim()) {
      const tq = tagFilter.trim().toLowerCase();
      list = list.filter(p => (p.tags || []).some(t => t.toLowerCase().includes(tq)));
    }

    list.sort((a, b) => {
      if (sort.key === 'syncedAt' || sort.key === 'solvedAt') {
        const da = new Date(a.solvedAt || a.syncedAt || a.createdAt);
        const db = new Date(b.solvedAt || b.syncedAt || b.createdAt);
        return sort.dir === 'desc' ? db - da : da - db;
      }
      if (sort.key === 'title') {
        return sort.dir === 'asc' ? (a.title || '').localeCompare(b.title || '') : (b.title || '').localeCompare(a.title || '');
      }
      return 0;
    });

    return list;
  }, [safe, platform, difficulty, searchQuery, tagFilter, sort]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const toggleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
    setPage(1);
  };

  const handleUpdateStatus = async (problemId, newStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/notes/${problemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        onDataRefresh?.();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleToggleReview = async (problem) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/review/${problem._id}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !problem.review?.enabled })
      });
      if (res.ok) {
        onDataRefresh?.();
      }
    } catch (err) {
      console.error('Failed to toggle review:', err);
    }
  };

  const chipStyle = (active) => ({
    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
    cursor: 'pointer', border: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--bg-base)',
    color:      active ? '#0D1117' : 'var(--text-secondary)',
    transition: 'all 0.15s'
  });

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header rail */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>DSA Problem Ledger</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            Showing {filtered.length} of {safe.length} synced problems
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={() => setShowManualModal(true)} style={{ fontSize: 12, gap: 6 }}>
            <Plus size={13} /> Add Manual Problem
          </button>
          <button className="btn-primary" onClick={onSync} style={{ fontSize: 12 }}>
            <RefreshCw size={13} /> Sync Data
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="tracker-filters" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border)' }}>
        <Filter size={13} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>PLATFORM:</span>
        {PLATFORMS.map(p => (
          <button key={p} onClick={() => { setPlatform(p); setPage(1); }} style={chipStyle(platform === p)}>{p}</button>
        ))}

        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>DIFFICULTY:</span>
        {DIFFICULTIES.map(d => (
          <button key={d} onClick={() => { setDifficulty(d); setPage(1); }} style={chipStyle(difficulty === d)}>{d}</button>
        ))}

        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>TAG:</span>
        <input
          value={tagFilter}
          onChange={e => { setTagFilter(e.target.value); setPage(1); }}
          placeholder="e.g. dp"
          className="input-field"
          style={{ padding: '3px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', width: 100, height: 26 }}
        />
        {tagFilter && (
          <button onClick={() => { setTagFilter(''); setPage(1); }} style={{ ...chipStyle(false), padding: '3px 6px' }}>✕</button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'var(--bg-base)', padding: 2, borderRadius: 4, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 11, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)',
              background: viewMode === 'table' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'table' ? '#0D1117' : 'var(--text-muted)'
            }}
          >
            <List size={13} /> Table
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 11, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)',
              background: viewMode === 'kanban' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'kanban' ? '#0D1117' : 'var(--text-muted)'
            }}
          >
            <LayoutGrid size={13} /> Kanban
          </button>
        </div>
      </div>

      {/* Problem View */}
      {viewMode === 'table' ? (
        <div className="glass" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('title')} style={{ cursor: 'pointer', userSelect: 'none', width: '40%' }}>
                  Problem {sort.key === 'title' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Platform</th>
                <th>Rating / Difficulty</th>
                <th className="col-tags">Tags</th>
                <th onClick={() => toggleSort('solvedAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Solved {sort.key === 'solvedAt' || sort.key === 'syncedAt' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ textAlign: 'center' }}>Spaced Review</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    {safe.length === 0
                      ? 'No problems synced yet. Click Sync Now in the top right to import your solved problems!'
                      : 'No problem records match your selected filters.'}
                  </td>
                </tr>
              ) : pageItems.map((p, i) => (
                <tr key={p._id || i} onClick={() => setDetailProblem(p)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{p.title}</span>
                      {p.unverified && (
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                          Unverified
                        </span>
                      )}
                      {p.source === 'manual' && (
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(240,136,62,0.3)', fontFamily: 'var(--font-mono)' }}>
                          Manual
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${p.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`}>
                      {p.platform === 'LeetCode' ? 'LC' : 'CF'}
                    </span>
                  </td>
                  <td>
                    <span className={getRatingClass(p.difficulty)} style={{ fontSize: 13 }}>
                      {(!p.difficulty || p.difficulty === 'Unknown') ? 'Medium' : p.difficulty}
                    </span>
                  </td>
                  <td className="col-tags">
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(p.tags || []).length === 0 ? (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>—</span>
                      ) : (p.tags || []).slice(0, 3).map(t => (
                        <span
                          key={t}
                          onClick={(e) => { e.stopPropagation(); setTagFilter(tagFilter === t ? '' : t); setPage(1); }}
                          style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 3,
                            cursor: 'pointer', fontFamily: 'var(--font-mono)',
                            color:      tagFilter === t ? 'var(--accent)' : 'var(--text-muted)',
                            background: tagFilter === t ? 'var(--accent-dim)' : 'var(--bg-muted)',
                            border: '1px solid ' + (tagFilter === t ? 'rgba(240,136,62,0.3)' : 'var(--border)')
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    {timeAgo(p.solvedAt || p.syncedAt || p.createdAt)}
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleReview(p)}
                      title={p.review?.enabled ? 'Disable spaced review' : 'Enable spaced review queue'}
                      style={{
                        background: p.review?.enabled ? 'var(--accent-dim)' : 'var(--bg-base)',
                        border: `1px solid ${p.review?.enabled ? 'rgba(240,136,62,0.4)' : 'var(--border)'}`,
                        color: p.review?.enabled ? 'var(--accent)' : 'var(--text-muted)',
                        borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <Repeat size={11} /> {p.review?.enabled ? 'Active' : '+ Add'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} ({filtered.length} total)
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 8px', fontSize: 11 }}>
                  <ChevronLeft size={13} /> Prev
                </button>
                <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '4px 8px', fontSize: 11 }}>
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <KanbanBoard
          problems={filtered}
          onSelectProblem={setDetailProblem}
          onUpdateStatus={handleUpdateStatus}
          token={token}
        />
      )}

      <ProblemDetailModal
        problem={detailProblem}
        isOpen={!!detailProblem}
        onClose={() => setDetailProblem(null)}
        token={token}
        onDataRefresh={onDataRefresh}
      />

      <ManualProblemModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        token={token}
        onDataRefresh={onDataRefresh}
      />
    </div>
  );
}
