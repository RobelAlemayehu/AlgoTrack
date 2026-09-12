import React from 'react';
import {
  LayoutDashboard, Activity, BarChart3, BookOpen,
  Settings, LogOut, Zap, Users, Repeat, User, Map, Target, Timer,
  PanelLeftClose
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'Home',      icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { id: 'Tracker',   icon: <Activity size={16} />,        label: 'DSA Tracker' },
  { id: 'Roadmaps',  icon: <Map size={16} />,             label: 'Roadmaps' },
  { id: 'Drill',     icon: <Target size={16} />,          label: 'Drill Mode' },
  { id: 'Simulator', icon: <Timer size={16} />,           label: 'Contest Simulator' },
  { id: 'Review',    icon: <Repeat size={16} />,          label: 'Review Queue' },
  { id: 'Analytics', icon: <BarChart3 size={16} />,       label: 'Analytics' },
  { id: 'Notes',     icon: <BookOpen size={16} />,        label: 'Notes' },
  { id: 'Groups',    icon: <Users size={16} />,           label: 'Study Groups' },
  { id: 'Compare',   icon: <Users size={16} />,           label: 'Compare' },
  { id: 'Profile',   icon: <User size={16} />,            label: 'Profile' },
];

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, totalSolved, isOpen, collapsed, onToggleCollapse }) {
  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`} style={{
      width: collapsed ? 68 : 240,
      minWidth: collapsed ? 68 : 240,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: collapsed ? '16px 8px' : '20px 14px',
      height: '100vh',
      position: 'relative', overflow: 'hidden',
      transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s ease'
    }}>
      {/* Header & Toggle Button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        padding: '4px 4px', marginBottom: 20
      }}>
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            title="Open sidebar"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <img src="/logo.png" alt="AlgoTrack Logo" style={{
              width: 32, height: 32, borderRadius: 6, display: 'block'
            }} />
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo.png" alt="Logo" style={{
                width: 30, height: 30, borderRadius: 6, display: 'block', flexShrink: 0
              }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>AlgoTrack</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>v2.0 · Competitive</div>
              </div>
            </div>

            {/* Sidebar Collapse Toggle Button */}
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <PanelLeftClose size={15} />
            </button>
          </>
        )}
      </div>

      {/* Solved Stats Strip */}
      {totalSolved > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8,
          padding: collapsed ? '8px 4px' : '7px 10px', borderRadius: 6,
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          marginBottom: 16
        }} title={`${totalSolved} problems solved`}>
          <Zap size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {totalSolved} solved
            </span>
          )}
        </div>
      )}

      {/* Nav List */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            title={collapsed ? item.label : undefined}
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '8px 10px'
            }}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </div>
        ))}
      </nav>

      {/* Footer / Settings */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          className={`nav-item${activeTab === 'Settings' ? ' active' : ''}`}
          onClick={() => setActiveTab('Settings')}
          title={collapsed ? "Settings" : undefined}
          style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '8px 10px'
          }}
        >
          <Settings size={16} />
          {!collapsed && <span>Settings</span>}
        </div>

        {/* User Badge */}
        <div style={{
          marginTop: 6, padding: collapsed ? '8px 4px' : '8px 10px', borderRadius: 6,
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 8
        }} title={user?.username || 'User'}>
          <div style={{
            width: 26, height: 26, borderRadius: 4,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#0D1117', flexShrink: 0,
            fontFamily: 'var(--font-mono)'
          }}>
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username || 'User'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ● connected
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              title="Sign out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--cf-red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

