import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Trophy, X, Zap } from 'lucide-react';

export default function ToastContainer({ toasts = [], onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 3000,
      display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360, width: '100%'
    }}>
      {toasts.map(t => {
        const isSuccess = t.type === 'success' || t.type === 'target';
        const isWarning = t.type === 'warning' || t.type === 'streak';
        const isBadge = t.type === 'badge';

        const bg = isBadge
          ? 'var(--bg-surface)'
          : (isSuccess ? 'var(--bg-surface)' : 'var(--bg-surface)');

        const borderColor = isBadge
          ? 'rgba(240,136,62,0.6)'
          : (isSuccess ? 'rgba(63,185,80,0.5)' : 'rgba(255,123,114,0.5)');

        return (
          <div
            key={t.id || Math.random()}
            className="animate-fade-in glass"
            style={{
              padding: '12px 16px', borderRadius: 8, background: bg,
              border: `1px solid ${borderColor}`, boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {isBadge ? <Trophy size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                : isSuccess ? <CheckCircle2 size={18} style={{ color: 'var(--cf-green)', flexShrink: 0, marginTop: 2 }} />
                : <AlertTriangle size={18} style={{ color: 'var(--cf-red)', flexShrink: 0, marginTop: 2 }} />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>{t.message}</div>
              </div>
            </div>
            <button onClick={() => onCloseToast?.(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
