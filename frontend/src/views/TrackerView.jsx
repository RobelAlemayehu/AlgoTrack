import React, { useState, useMemo } from 'react';
import { RefreshCw, Code, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

function getDiffClass(d) {
  if (!d) return 'badge badge-unknown';
  const l = d.toLowerCase();
  if (l === 'easy')   return 'badge badge-easy';
  if (l === 'medium') return 'badge badge-medium';
  if (l === 'hard')   return 'badge badge-hard';
  const r = parseInt(d);
  if (!isNaN(r)) {
    if (r < 1200) return 'badge badge-easy';
    if (r < 1900) return 'badge badge-medium';
    return 'badge badge-hard';
  }
  return 'badge badge-unknown';
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

const ITEMS_PER_PAGE = 10;
const PLATFORMS    = ['All', 'LeetCode', 'Codeforces'];
const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

const chipStyle = (active) => ({
  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', border: 'none',
  background: active ? 'var(--indigo-dim)' : 'rgba(255,255,255,0.04)',
  color:      active ? 'var(--indigo-light)' : 'var(--text-muted)',
  outline: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)',
  transition: 'all 0.15s'
});

export default function TrackerView({ problems, lastSyncTime, onSync, searchQuery }) {
  const [platform,   setPlatform]   = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [tagFilter,  setTagFilter]  = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: 'syncedAt', dir: 'desc' });

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
      if (sort.key === 'syncedAt') {
        const da = new Date(a.syncedAt || a.createdAt);
        const db = new Date(b.syncedAt || b.createdAt);
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

  const lastSyncDisplay = () => {
    if (!lastSyncTime) return 'Never';
    const diff = Date.now() - new Date(lastSyncTime).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  };

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>DSA Tracker</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
            Last synced {lastSyncDisplay()} · {safe.length} problems
          </p>
        </div>
        <button className="btn-primary" onClick={onSync} style={{ fontSize: 13 }}>
          <RefreshCw size={14} /> Sync Data
        </button>
      </div>

      {/* Filters */}
      <div className="tracker-filters" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Filter size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Platform</span>
        {PLATFORMS.map(p => (
          <button key={p} onClick={() => { setPlatform(p); setPage(1); }} style={chipStyle(platform === p)}>{p}</button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Difficulty</span>
        {DIFFICULTIES.map(d => (
          <button key={d} onClick={() => { setDifficulty(d); setPage(1); }} style={chipStyle(difficulty === d)}>{d}</button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tag</span>
        <input
          value={tagFilter}
          onChange={e => { setTagFilter(e.target.value); setPage(1); }}
          placeholder="e.g. dp, graphs"
          style={{
            background: tagFilter ? 'var(--indigo-dim)' : 'rgba(255,255,255,0.04)',
            border: tagFilter ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)',
            borderRadius: 8, padding: '5px 10px', fontSize: 12,
            color: 'var(--text-primary)', outline: 'none', width: 120, fontFamily: 'Inter, sans-serif'
          }}
        />
        {tagFilter && (
          <button onClick={() => { setTagFilter(''); setPage(1); }} style={{ ...chipStyle(false), padding: '5px 8px' }}>✕</button>
        )}
      </div>

      {/* Table */}
      <div className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('title')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Problem {sort.key === 'title' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th>Platform</th>
              <th>Difficulty</th>
              <th className="col-tags">Tags</th>
              <th onClick={() => toggleSort('syncedAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Solved {sort.key === 'syncedAt' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  {safe.length === 0
                    ? 'No problems synced yet. Go to Settings → add your handles → Save & Sync!'
                    : 'No results match your filters.'}
                </td>
              </tr>
            ) : pageItems.map((p, i) => (
              <tr key={p._id || i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: p.platform === 'LeetCode' ? 'var(--orange-dim)' : 'var(--blue-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: p.platform === 'LeetCode' ? 'var(--orange)' : 'var(--blue)'
                    }}>
                      <Code size={13} />
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{p.title}</span>
                  </div>
                </td>
                <td>
                  <span className={p.platform === 'LeetCode' ? 'badge badge-lc' : 'badge badge-cf'}>
                    {p.platform === 'LeetCode' ? 'LC' : 'CF'}
                  </span>
                </td>
                <td>
                  <span className={getDiffClass(p.difficulty)}>{p.difficulty || '—'}</span>
                </td>
                <td className="col-tags">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
                    {(p.tags || []).length === 0 ? (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>
                    ) : (p.tags || []).slice(0, 3).map(t => (
                      <span
                        key={t}
                        onClick={() => { setTagFilter(tagFilter === t ? '' : t); setPage(1); }}
                        style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 4,
                          cursor: 'pointer', textTransform: 'capitalize',
                          color:      tagFilter === t ? 'var(--indigo-light)' : 'var(--text-muted)',
                          background: tagFilter === t ? 'var(--indigo-dim)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (tagFilter === t ? 'rgba(99,102,241,0.3)' : 'transparent'),
                          transition: 'all 0.15s'
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {timeAgo(p.syncedAt || p.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 10px', fontSize: 12 }}>
                <ChevronLeft size={14} /> Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)} style={{
                    width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: page === pg ? 'var(--indigo)' : 'rgba(255,255,255,0.04)',
                    color:      page === pg ? 'white'        : 'var(--text-muted)'
                  }}>{pg}</button>
                );
              })}
              <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 10px', fontSize: 12 }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
