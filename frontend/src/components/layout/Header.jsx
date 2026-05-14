import React, { useState } from 'react';
import { Search, RefreshCw, Bell } from 'lucide-react';

export default function Header({ onSync, loading, onSearch, searchQuery }) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header style={{
      height: 64, borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', background: 'rgba(13,21,38,0.8)',
      backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Search */}
      <div style={{ position: 'relative', width: 320 }}>
        <Search size={15} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)'
        }} />
        <input
          className="input-field"
          style={{ paddingLeft: 36, fontSize: 13, height: 38 }}
          placeholder="Search problems…"
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Sync button */}
        <button className="btn-primary" onClick={onSync} disabled={loading} style={{ fontSize: 13, padding: '8px 16px' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Syncing…' : 'Sync Now'}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <Bell size={16} />
          </button>
          {notifOpen && (
            <div className="glass animate-fade-in" style={{
              position: 'absolute', right: 0, top: 46, width: 280, borderRadius: 12,
              padding: '12px', zIndex: 200
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>NOTIFICATIONS</p>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0', textAlign: 'center' }}>
                No notifications yet.<br/>Sync your profiles to get started!
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
