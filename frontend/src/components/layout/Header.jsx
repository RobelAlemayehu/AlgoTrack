import React, { useState } from 'react';
import { Search, RefreshCw, Bell, Menu } from 'lucide-react';

export default function Header({ onSync, loading, onSearch, searchQuery, notifications = [], onMenuToggle, minimal = false }) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header style={{
      height: 64, borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', background: 'rgba(13,21,38,0.8)',
      backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100,
      gap: 12,
    }}>
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        style={{
          display: 'none', // shown via CSS on mobile
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', padding: 4, flexShrink: 0
        }}
        className="menu-toggle"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Search + actions — hidden in minimal (Notes) mode */}
      {!minimal && (
        <>
          <div className="header-search" style={{ position: 'relative', width: 320, flex: '1 1 auto', maxWidth: 320 }}>
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
                  cursor: 'pointer', color: notifications.length > 0 ? 'var(--orange)' : 'var(--text-secondary)', transition: 'background 0.15s',
                  position: 'relative'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2, width: 8, height: 8,
                    borderRadius: '50%', background: 'var(--red)', border: '2px solid var(--bg-base)'
                  }} />
                )}
              </button>
              {notifOpen && (
                <div className="glass animate-fade-in" style={{
                  position: 'absolute', right: 0, top: 46, width: 300, borderRadius: 12,
                  padding: '16px', zIndex: 200, boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.05em' }}>NOTIFICATIONS</p>
                  {notifications.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0', textAlign: 'center' }}>
                      No active notifications.<br/>You're all caught up!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {notifications.map(n => (
                        <div key={n.id} style={{
                          padding: '10px 12px', borderRadius: 8,
                          background: n.urgency === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)',
                          border: `1px solid ${n.urgency === 'high' ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.2)'}`,
                          color: n.urgency === 'high' ? 'var(--red)' : 'var(--orange)',
                          fontSize: 12, lineHeight: 1.4
                        }}>
                          {n.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
