import React from 'react';
import {
  LayoutDashboard, Activity, BarChart3, BookOpen,
  Settings, Trophy, LogOut, Zap, Users
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'Home',      icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { id: 'Tracker',   icon: <Activity size={18} />,        label: 'DSA Tracker' },
  { id: 'Analytics', icon: <BarChart3 size={18} />,       label: 'Analytics' },
  { id: 'Notes',     icon: <BookOpen size={18} />,        label: 'Notes' },
  { id: 'Compare',   icon: <Users size={18} />,           label: 'Compare' },
];

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, totalSolved }) {
  return (
    <aside style={{
      width: 240, minWidth: 240,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '24px 16px',
      height: '100vh',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -60, left: -60,
        width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 6px', marginBottom: 32 }}>
        <div style={{
          width: 38, height: 38,
          background: 'linear-gradient(135deg, #6366F1, #10B981)',
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99,102,241,0.3)'
        }}>
          <Trophy size={18} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>AlgoTrack</div>
          <div style={{ fontSize: 9, color: 'var(--indigo-light)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Pro Tracker</div>
        </div>
      </div>

      {/* Solved Badge */}
      {totalSolved > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 10,
          background: 'var(--indigo-dim)', border: '1px solid rgba(99,102,241,0.2)',
          marginBottom: 20
        }}>
          <Zap size={14} color="var(--indigo-light)" />
          <span style={{ fontSize: 12, color: 'var(--indigo-light)', fontWeight: 600 }}>
            {totalSolved} problems solved
          </span>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
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

      {/* Bottom */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          className={`nav-item${activeTab === 'Settings' ? ' active' : ''}`}
          onClick={() => setActiveTab('Settings')}
        >
          <Settings size={18} />
          <span>Settings</span>
        </div>

        {/* User card */}
        <div style={{
          marginTop: 8, padding: '10px 12px', borderRadius: 10,
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0
          }}>
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username || 'User'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
              Online
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
