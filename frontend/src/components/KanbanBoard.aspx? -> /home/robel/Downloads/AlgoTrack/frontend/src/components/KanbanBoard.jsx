import React, { useState } from 'react';
import { Layers, ChevronLeft, ChevronRight, Grid, Columns } from 'lucide-react';
import CustomSelect from './ui/CustomSelect';

const COLUMNS = [
  { id: 'To Do', title: 'To Do', color: 'var(--accent)', bg: 'rgba(240,136,62,0.08)' },
  { id: 'Attempted', title: 'Attempted', color: 'var(--blue-400)', bg: 'rgba(77,157,224,0.08)' },
  { id: 'Solved', title: 'Solved', color: 'var(--cf-green)', bg: 'rgba(63,185,80,0.08)' },
  { id: 'Needs Review', title: 'Needs Review', color: 'var(--purple-400)', bg: 'rgba(163,113,247,0.08)' }
];

const columnOptions = COLUMNS.map(c => ({ value: c.id, label: c.title }));

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

export default function KanbanBoard({ problems, onSelectProblem, onUpdateStatus, token }) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'To Do' | 'Attempted' | 'Solved' | 'Needs Review'
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [colPages, setColPages] = useState({
    'To Do': 1,
    'Attempted': 1,
    'Solved': 1,
    'Needs Review': 1,
    'grid': 1
  });

  const safeProblems = Array.isArray(problems) ? problems.filter(p => !p.archived) : [];

  const getProblemStatus = (p) => {
    const s = p.status;
    if (COLUMNS.some(c => c.id === s)) return s;
    return 'Solved';
  };

  const columnsData = COLUMNS.map(col => ({
    ...col,
    items: safeProblems.filter(p => getProblemStatus(p) === col.id)
  }));

  const handleDragStart = (e, problemId) => {
    setDraggedId(problemId);
    e.dataTransfer.setData('text/plain', problemId);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    const probId = e.dataTransfer.getData('text/plain') || draggedId;
    if (!probId) return;

    const prob = safeProblems.find(p => p._id === probId);
    if (!prob || getProblemStatus(prob) === colId) return;

    await onUpdateStatus(probId, colId);
    setDraggedId(null);
  };

  const setPageForCol = (colId, pageNum) => {
    setColPages(prev => ({ ...prev, [colId]: pageNum }));
  };

  const renderCard = (p, colColor = 'var(--accent)') => (
    <div
      key={p._id}
      draggable
      onDragStart={e => handleDragStart(e, p._id)}
      onClick={() => onSelectProblem(p)}
      className="glass"
      style={{
        borderRadius: 6,
        padding: '12px 14px',
        cursor: 'grab',
        border: '1px solid var(--border)',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'transform 0.15s, border-color 0.15s',
        userSelect: 'none'
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = colColor}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.title}</span>
        <span className={`badge ${p.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`} style={{ flexShrink: 0 }}>
          {p.platform === 'LeetCode' ? 'LC' : 'CF'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <span className={getRatingClass(p.difficulty)} style={{ fontSize: 11 }}>
          {(!p.difficulty || p.difficulty === 'Unknown') ? 'Medium' : p.difficulty}
        </span>

        <div onClick={e => e.stopPropagation()} style={{ width: 110 }}>
          <CustomSelect
            value={getProblemStatus(p)}
            options={columnOptions}
            minWidth={100}
            onChange={val => onUpdateStatus(p._id, val)}
          />
        </div>
      </div>

      {p.tags && p.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
          {p.tags.slice(0, 3).map(t => (
            <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border)' }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {/* Control Bar: Section Tabs & Items Per Page */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
        {/* Section Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '4px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
              cursor: 'pointer', border: '1px solid ' + (activeTab === 'all' ? 'var(--accent)' : 'var(--border)'),
              background: activeTab === 'all' ? 'var(--accent)' : 'var(--bg-base)',
              color: activeTab === 'all' ? '#0D1117' : 'var(--text-secondary)',
              transition: 'all 0.15s'
            }}
          >
            All Columns ({safeProblems.length})
          </button>

          {columnsData.map(col => {
            const isActive = activeTab === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveTab(col.id)}
                style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                  cursor: 'pointer', border: '1px solid ' + (isActive ? col.color : 'var(--border)'),
                  background: isActive ? col.color : 'var(--bg-base)',
                  color: isActive ? '#0D1117' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#0D1117' : col.color }} />
                {col.title} ({col.items.length})
              </button>
            );
          })}
        </div>

        {/* Items Per Page Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>Per page:</span>
          {[12, 24, 48].map(size => (
            <button
              key={size}
              onClick={() => { setItemsPerPage(size); setColPages({'To Do': 1, 'Attempted': 1, 'Solved': 1, 'Needs Review': 1, 'grid': 1}); }}
              style={{
                padding: '2px 6px', borderRadius: 3, border: '1px solid ' + (itemsPerPage === size ? 'var(--accent)' : 'var(--border)'),
                background: itemsPerPage === size ? 'var(--accent-dim)' : 'transparent',
                color: itemsPerPage === size ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 11, fontWeight: 600
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Main View: Either 4 Columns Board or Full Screen Grid */}
      {activeTab === 'all' ? (
        /* 4-Column Board Layout - All columns identical height stretching to bottom of screen */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, alignItems: 'stretch', width: '100%' }}>
          {columnsData.map(col => {
            const isTarget = dragOverCol === col.id;
            const pageNum = colPages[col.id] || 1;
            const totalPages = Math.ceil(col.items.length / itemsPerPage) || 1;
            const paginatedItems = col.items.slice((pageNum - 1) * itemsPerPage, pageNum * itemsPerPage);

            return (
              <div
                key={col.id}
                onDragOver={e => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, col.id)}
                className="glass"
                style={{
                  borderRadius: 8,
                  padding: 14,
                  height: 'calc(100vh - 230px)',
                  minHeight: 480,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  border: isTarget ? `2px dashed ${col.color}` : '1px solid var(--border)',
                  background: isTarget ? col.bg : 'var(--bg-surface)',
                  transition: 'all 0.2s ease',
                  overflow: 'hidden'
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{col.title}</h3>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-muted)', color: col.color, border: '1px solid var(--border)' }}>
                    {col.items.length}
                  </span>
                </div>

                {/* Column Cards Container with vertical scroll filling available height */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', paddingRight: 2 }}>
                  {col.items.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 6, margin: '4px 0' }}>
                      Drag cards here
                    </div>
                  ) : (
                    paginatedItems.map(p => renderCard(p, col.color))
                  )}
                </div>

                {/* Column Pagination Footer */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      Page {pageNum}/{totalPages}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn-ghost"
                        onClick={() => setPageForCol(col.id, Math.max(1, pageNum - 1))}
                        disabled={pageNum === 1}
                        style={{ padding: '2px 6px', fontSize: 10 }}
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => setPageForCol(col.id, Math.min(totalPages, pageNum + 1))}
                        disabled={pageNum === totalPages}
                        style={{ padding: '2px 6px', fontSize: 10 }}
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Full Screen Grid View for Selected Section (e.g. Solved) - Stretching to bottom of screen */
        (() => {
          const selectedCol = columnsData.find(c => c.id === activeTab) || columnsData[2];
          const pageNum = colPages['grid'] || 1;
          const totalPages = Math.ceil(selectedCol.items.length / itemsPerPage) || 1;
          const paginatedItems = selectedCol.items.slice((pageNum - 1) * itemsPerPage, pageNum * itemsPerPage);

          return (
            <div className="glass" style={{ borderRadius: 8, padding: 18, minHeight: 'calc(100vh - 230px)', display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
              {/* Header for Full Grid Section */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedCol.color }} />
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedCol.title} Problems Grid
                  </h2>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, background: 'var(--bg-muted)', color: selectedCol.color, border: '1px solid var(--border)' }}>
                    {selectedCol.items.length} Total
                  </span>
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Showing {paginatedItems.length} of {selectedCol.items.length} cards
                </span>
              </div>

              {/* Full Width Multi-Column Cards Grid */}
              {selectedCol.items.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 8, padding: 40 }}>
                  No problems currently in {selectedCol.title}.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, width: '100%', flex: 1, alignContent: 'start' }}>
                  {paginatedItems.map(p => renderCard(p, selectedCol.color))}
                </div>
              )}

              {/* Full Grid View Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 14, flexWrap: 'wrap', gap: 10, marginTop: 'auto' }}>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Page {pageNum} of {totalPages} ({selectedCol.items.length} total)
                  </span>

                  {/* Page Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      className="btn-ghost"
                      onClick={() => setPageForCol('grid', Math.max(1, pageNum - 1))}
                      disabled={pageNum === 1}
                      style={{ padding: '4px 8px', fontSize: 11 }}
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>

                    {Array.from({ length: Math.min(7, totalPages) }, (_, idx) => {
                      let pNo;
                      if (totalPages <= 7) {
                        pNo = idx + 1;
                      } else if (pageNum <= 4) {
                        pNo = idx + 1;
                      } else if (pageNum >= totalPages - 3) {
                        pNo = totalPages - 6 + idx;
                      } else {
                        pNo = pageNum - 3 + idx;
                      }
                      return (
                        <button
                          key={pNo}
                          onClick={() => setPageForCol('grid', pNo)}
                          style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                            cursor: 'pointer', border: '1px solid ' + (pageNum === pNo ? selectedCol.color : 'var(--border)'),
                            background: pageNum === pNo ? selectedCol.color : 'var(--bg-base)',
                            color: pageNum === pNo ? '#0D1117' : 'var(--text-secondary)'
                          }}
                        >
                          {pNo}
                        </button>
                      );
                    })}

                    <button
                      className="btn-ghost"
                      onClick={() => setPageForCol('grid', Math.min(totalPages, pageNum + 1))}
                      disabled={pageNum === totalPages}
                      style={{ padding: '4px 8px', fontSize: 11 }}
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
