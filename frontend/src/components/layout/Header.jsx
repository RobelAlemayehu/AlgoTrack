import React, { useState } from 'react';
import { Search, RefreshCw, Bell, Menu, Sun, Moon } from 'lucide-react';

export default function Header({ onSync, loading, onSearch, searchQuery, notifications = [], onMenuToggle, minimal = false, theme = 'dark', onThemeToggle }) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header style={{
      height: 56, borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', background: 'var(--bg-surface)',
      position: 'sticky', top: 0, zIndex: 100,
      gap: 12,
    }}>
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        style={{
          display: 'none',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', padding: 4, flexShrink: 0
        }}
        className="menu-toggle"
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      {/* Search + actions — hidden in minimal (Notes) mode */}
      {!minimal && (
        <>
          <div className="header-search" style={{ position: 'relative', width: 300, flex: '1 1 auto', maxWidth: 300 }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              className="input-field"
              style={{ paddingLeft: 32, fontSize: 12, height: 34 }}
              placeholder="Search problems or tags…"
              value={searchQuery}
              onChange={e => onSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Theme Toggle Button */}
            <button
              onClick={onThemeToggle}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              style={{
                width: 34, height: 34, borderRadius: 6,
                background: 'var(--bg-base)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-secondary)'
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Sync button */}
            <button className="btn-primary" onClick={onSync} disabled={loading} style={{ fontSize: 12, height: 34 }}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Syncing…' : 'Sync Now'}
            </button>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                style={{
                  width: 34, height: 34, borderRadius: 6,
                  background: 'var(--bg-base)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: notifications.length > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                  position: 'relative'
                }}
              >
                <Bell size={15} />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2, width: 7, height: 7,
                    borderRadius: '50%', background: 'var(--cf-red)'
                  }} />
                )}
              </button>
              {notifOpen && (
                <div className="glass animate-fade-in" style={{
                  position: 'absolute', right: 0, top: 42, width: 280, borderRadius: 8,
                  padding: '14px', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 10 }}>NOTIFICATIONS</p>
                  {notifications.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>
                      No new notifications.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notifications.map(n => (
                        <div key={n.id} style={{
                          padding: '8px 10px', borderRadius: 6,
                          background: n.urgency === 'high' ? 'var(--red-dim)' : 'var(--orange-dim)',
                          border: `1px solid ${n.urgency === 'high' ? 'rgba(255,123,114,0.3)' : 'rgba(240,136,62,0.3)'}`,
                          color: n.urgency === 'high' ? 'var(--cf-red)' : 'var(--accent)',
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

