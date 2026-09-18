import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Activity, BarChart3, BookOpen,
  Settings, LogOut, Zap, Users, Repeat, User, Map, Target, Timer,
  PanelLeftClose, ShieldCheck, HelpCircle, X
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
  { id: 'Admin',     icon: <ShieldCheck size={16} />,     label: 'Admin', adminOnly: true },
];

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, totalSolved, isOpen, collapsed, onToggleCollapse, onOpenOnboarding, onClose }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On mobile drawer view, sidebar is NEVER collapsed so names/labels are always visible!
  const isEffectiveCollapsed = collapsed && !isMobile;

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}${isEffectiveCollapsed ? ' collapsed' : ''}`} style={{
      width: isEffectiveCollapsed ? 68 : 240,
      minWidth: isEffectiveCollapsed ? 68 : 240,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: isEffectiveCollapsed ? '16px 8px' : '20px 14px',
      height: '100vh',
      position: 'relative', overflow: 'hidden',
      transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s ease'
    }}>
      {/* Header & Toggle / Close Button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: isEffectiveCollapsed ? 'center' : 'space-between',
        padding: '4px 4px', marginBottom: 20
      }}>
        {isMobile ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo.png" alt="Logo" style={{
                width: 30, height: 30, borderRadius: 6, display: 'block', flexShrink: 0
              }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>AlgoTrack</div>
              </div>
            </div>
            <button
              onClick={onClose}
              title="Close menu"
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
            >
              <X size={16} />
            </button>
          </>
        ) : isEffectiveCollapsed ? (
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
          display: 'flex', alignItems: 'center', justifyContent: isEffectiveCollapsed ? 'center' : 'flex-start', gap: 8,
          padding: isEffectiveCollapsed ? '8px 4px' : '7px 10px', borderRadius: 6,
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          marginBottom: 16
        }} title={`${totalSolved} problems solved`}>
          <Zap size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          {!isEffectiveCollapsed && (
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {totalSolved} solved
            </span>
          )}
        </div>
      )}

      {/* Nav List */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
        {NAV_ITEMS.filter(item => !item.adminOnly || user?.isAdmin === true).map(item => (
          <div
            key={item.id}
            data-tour={item.id.toLowerCase()}
            className={`nav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => {
              setActiveTab(item.id);
              if (isMobile && onClose) onClose();
            }}
            title={isEffectiveCollapsed ? item.label : undefined}
            style={{
              justifyContent: isEffectiveCollapsed ? 'center' : 'flex-start',
              padding: isEffectiveCollapsed ? '10px 0' : '8px 10px'
            }}
          >
            {item.icon}
            {!isEffectiveCollapsed && <span>{item.label}</span>}
          </div>
        ))}
      </nav>

      {/* Footer / Settings & Onboarding */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          className="nav-item"
          onClick={() => {
            onOpenOnboarding?.();
            if (isMobile && onClose) onClose();
          }}
          title={isEffectiveCollapsed ? "Guided Tour" : undefined}
          style={{
            justifyContent: isEffectiveCollapsed ? 'center' : 'flex-start',
            padding: isEffectiveCollapsed ? '10px 0' : '8px 10px',
            color: 'var(--text-muted)'
          }}
        >
          <HelpCircle size={16} style={{ color: 'var(--accent)' }} />
          {!isEffectiveCollapsed && <span>Guided Tour</span>}
        </div>

        <div
          className={`nav-item${activeTab === 'Settings' ? ' active' : ''}`}
          onClick={() => {
            setActiveTab('Settings');
            if (isMobile && onClose) onClose();
          }}
          title={isEffectiveCollapsed ? "Settings" : undefined}
          style={{
            justifyContent: isEffectiveCollapsed ? 'center' : 'flex-start',
            padding: isEffectiveCollapsed ? '10px 0' : '8px 10px'
          }}
        >
          <Settings size={16} />
          {!isEffectiveCollapsed && <span>Settings</span>}
        </div>

        {/* User Badge */}
        <div style={{
          marginTop: 6, padding: isEffectiveCollapsed ? '8px 4px' : '8px 10px', borderRadius: 6,
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: isEffectiveCollapsed ? 'center' : 'space-between', gap: 8
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
          {!isEffectiveCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username || 'User'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ● connected
              </div>
            </div>
          )}
          {!isEffectiveCollapsed && (
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


