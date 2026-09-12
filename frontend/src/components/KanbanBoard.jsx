import React, { useState } from 'react';
import { Layers, ChevronRight, Move, AlertCircle } from 'lucide-react';
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

  const safeProblems = Array.isArray(problems) ? problems.filter(p => !p.archived) : [];

  // Group problems by status (defaulting to 'Solved' if undefined/null or unrecognized)
  const getProblemStatus = (p) => {
    if (p.review?.enabled && (!p.status || p.status === 'Solved')) {
      // If review is enabled and status is default, optionally surface as Needs Review or Solved
      return p.status || 'Solved';
    }
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' }}>
      {columnsData.map(col => {
        const isTarget = dragOverCol === col.id;
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
              minHeight: 480,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              border: isTarget ? `2px dashed ${col.color}` : '1px solid var(--border)',
              background: isTarget ? col.bg : 'var(--bg-surface)',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Column Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{col.title}</h3>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-muted)', color: col.color, border: '1px solid var(--border)' }}>
                {col.items.length}
              </span>
            </div>

            {/* Column Problem Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
              {col.items.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 6, margin: 'auto 0' }}>
                  Drag cards here
                </div>
              ) : (
                col.items.map(p => (
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
                    onMouseEnter={e => e.currentTarget.style.borderColor = col.color}
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

                      {/* Quick Status Shift selector */}
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
                        {p.tags.slice(0, 2).map(t => (
                          <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border)' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
