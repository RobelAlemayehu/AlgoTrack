import React from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export default function Popup({ isOpen, onClose, title, message, type = 'info' }) {
  if (!isOpen) return null;

  const configs = {
    success: { icon: <CheckCircle2 size={20} />, accent: 'var(--emerald)', bg: 'var(--emerald-dim)' },
    error:   { icon: <AlertCircle size={20} />, accent: 'var(--red)', bg: 'var(--red-dim)' },
    warning: { icon: <AlertCircle size={20} />, accent: 'var(--yellow)', bg: 'var(--yellow-dim)' },
    info:    { icon: <Info size={20} />, accent: 'var(--indigo)', bg: 'var(--indigo-dim)' },
  };
  const c = configs[type] || configs.info;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(6,9,26,0.7)', backdropFilter: 'blur(8px)',
        padding: '16px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass animate-fade-in"
        style={{
          width: '100%', maxWidth: 420, borderRadius: 16, overflow: 'hidden',
          borderColor: c.accent + '40'
        }}
      >
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              padding: 10, borderRadius: 10, background: c.bg,
              color: c.accent, flexShrink: 0, display: 'flex'
            }}>
              {c.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{message}</p>
            </div>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 12, padding: '6px 14px' }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
