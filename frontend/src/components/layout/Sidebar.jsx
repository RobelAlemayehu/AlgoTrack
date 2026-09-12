import React from 'react';
import {
  LayoutDashboard, Activity, BarChart3, BookOpen,
  Settings, LogOut, Zap, Users, Repeat
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'Home',      icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { id: 'Tracker',   icon: <Activity size={16} />,        label: 'DSA Tracker' },
  { id: 'Review',    icon: <Repeat size={16} />,          label: 'Review Queue' },
  { id: 'Analytics', icon: <BarChart3 size={16} />,       label: 'Analytics' },
  { id: 'Notes',     icon: <BookOpen size={16} />,        label: 'Notes' },
  { id: 'Compare',   icon: <Users size={16} />,           label: 'Compare' },
];

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, totalSolved, isOpen }) {
  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`} style={{
      width: 240, minWidth: 240,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 14px',
      height: '100vh',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Logo Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px', marginBottom: 24 }}>
        <img src="/logo.png" alt="Logo" style={{
          width: 32, height: 32, borderRadius: 6, display: 'block'
        }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>AlgoTrack</div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>v2.0 · Competitive</div>
        </div>
      </div>

      {/* Solved Stats Strip */}
      {totalSolved > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 6,
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          marginBottom: 16
        }}>
          <Zap size={13} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
            {totalSolved} solved
          </span>
        </div>
      )}

      {/* Nav List */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Footer / Settings */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          className={`nav-item${activeTab === 'Settings' ? ' active' : ''}`}
          onClick={() => setActiveTab('Settings')}
        >
          <Settings size={16} />
          <span>Settings</span>
        </div>

        {/* User Badge */}
        <div style={{
          marginTop: 6, padding: '8px 10px', borderRadius: 6,
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 4,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#0D1117', flexShrink: 0,
            fontFamily: 'var(--font-mono)'
          }}>
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username || 'User'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ● connected
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--cf-red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

