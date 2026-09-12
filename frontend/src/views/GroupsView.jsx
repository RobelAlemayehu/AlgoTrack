import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Plus, UserPlus, Copy, LogOut, Flame, Trophy, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck, Eye, ExternalLink, Award, Map, ChevronRight } from 'lucide-react';

const API = import.meta.env.VITE_API || 'http://localhost:5000';

function getRankColor(rank) {
  if (!rank) return '#808080';
  const r = rank.toLowerCase();
  if (r.includes('candidate master')) return '#a0a';
  if (r.includes('master')) return '#ff8c00';
  if (r.includes('grandmaster')) return '#f00';
  if (r.includes('expert')) return '#0000ff';
  if (r.includes('specialist')) return '#03a89e';
  if (r.includes('pupil')) return '#008000';
  if (r.includes('newbie')) return '#808080';
  return 'var(--accent)';
}

export default function GroupsView({ token, showPopup }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [windowType, setWindowType] = useState('this_week');
  const [loading, setLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Modal States
  const [modalType, setModalType] = useState('none'); // 'none' | 'create' | 'join'
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Member Profile Modal State
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [memberProfileData, setMemberProfileData] = useState(null);
  const [memberProfileLoading, setMemberProfileLoading] = useState(false);

  // Fetch user groups
  const fetchUserGroups = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/groups/my-groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data || []);
        if (data.length > 0 && !selectedGroupId) {
          setSelectedGroupId(data[0]._id);
        }
      }
    } catch (err) {
      console.error('Fetch groups error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserGroups();
  }, [token]);

  // Fetch leaderboard when selected group or window changes
  useEffect(() => {
    if (!selectedGroupId || !token) return;

    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      try {
        const res = await fetch(`${API}/api/groups/${selectedGroupId}/leaderboard?window=${windowType}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLeaderboardData(data);
        }
      } catch (err) {
        console.error('Fetch leaderboard error:', err);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedGroupId, windowType, token]);

  const handleOpenMemberProfile = async (memberId) => {
    if (!selectedGroupId || !token) return;
    setSelectedMemberId(memberId);
    setMemberProfileData(null);
    setMemberProfileLoading(true);
    try {
      const res = await fetch(`${API}/api/groups/${selectedGroupId}/member/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMemberProfileData(data.memberProfile);
      } else {
        showPopup?.('Error', 'Unable to fetch member profile details.', 'error');
      }
    } catch (err) {
      console.error('Fetch member profile error:', err);
    } finally {
      setMemberProfileLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: createName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showPopup?.('Group Created!', `Study group "${data.group.name}" created with code ${data.group.inviteCode}`, 'success');
        setModalType('none');
        setCreateName('');
        await fetchUserGroups();
        if (data.group?._id) setSelectedGroupId(data.group._id);
      } else {
        showPopup?.('Creation Failed', data.error || 'Could not create group.', 'error');
      }
    } catch (err) {
      showPopup?.('Error', 'Network error creating group.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode: joinCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showPopup?.('Joined Group!', `You joined "${data.group.name}" successfully.`, 'success');
        setModalType('none');
        setJoinCode('');
        await fetchUserGroups();
        if (data.group?._id) setSelectedGroupId(data.group._id);
      } else {
        showPopup?.('Join Failed', data.error || 'Could not join group.', 'error');
      }
    } catch (err) {
      showPopup?.('Error', 'Network error joining group.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to leave this study group?')) return;
    try {
      const res = await fetch(`${API}/api/groups/${groupId}/leave`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showPopup?.('Left Group', 'You have left the study group.', 'info');
        const remaining = groups.filter(g => g._id !== groupId);
        setGroups(remaining);
        setSelectedGroupId(remaining.length > 0 ? remaining[0]._id : null);
        setLeaderboardData(null);
      }
    } catch (err) {
      showPopup?.('Error', 'Failed to leave group.', 'error');
    }
  };

  const selectedGroup = groups.find(g => g._id === selectedGroupId);

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    showPopup?.('Code Copied!', `Invite code ${code} copied to clipboard.`, 'success');
  };

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Study Groups &amp; Leaderboards
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            Form private practice circles, share invite codes, and click any member to view full profile details
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={() => setModalType('join')} style={{ fontSize: 12, gap: 6 }}>
            <UserPlus size={14} style={{ color: 'var(--accent)' }} /> Join Group via Code
          </button>
          <button className="btn-primary" onClick={() => setModalType('create')} style={{ fontSize: 12, gap: 6 }}>
            <Plus size={14} /> Create Study Group
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }} className="grid-2col">
        {/* Groups Rail */}
        <div className="glass" style={{ borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, height: 'fit-content' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
            MY STUDY GROUPS ({groups.length})
          </div>

          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              <RefreshCw size={16} className="animate-spin" style={{ margin: '0 auto 6px' }} />
              Loading groups…
            </div>
          ) : groups.length === 0 ? (
            <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              <Users size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>No Groups Joined</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Create a new group or join a friend's group using an invite code.</p>
            </div>
          ) : (
            groups.map(g => (
              <div
                key={g._id}
                onClick={() => setSelectedGroupId(g._id)}
                style={{
                  padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
                  background: selectedGroupId === g._id ? 'var(--bg-muted)' : 'var(--bg-surface)',
                  border: `1px solid ${selectedGroupId === g._id ? 'var(--accent)' : 'var(--border)'}`,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: selectedGroupId === g._id ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>
                  {g.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>{g.memberCount} member{g.memberCount === 1 ? '' : 's'}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>by {g.createdBy}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Group Leaderboard & Details Panel */}
        <div>
          {selectedGroup && leaderboardData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Selected Group Top Card */}
              <div className="glass" style={{ borderRadius: 8, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} style={{ color: 'var(--accent)' }} />
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{leaderboardData.group.name}</h2>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>
                      {leaderboardData.group.memberCount} / 20 Members
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Invite Code:</span>
                    <button
                      onClick={() => copyInviteCode(leaderboardData.group.inviteCode)}
                      className="btn-ghost"
                      style={{ padding: '3px 8px', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', gap: 6 }}
                    >
                      {leaderboardData.group.inviteCode} <Copy size={12} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleLeaveGroup(leaderboardData.group._id)}
                  className="btn-ghost"
                  style={{ fontSize: 12, color: 'var(--cf-red)', borderColor: 'rgba(255,123,114,0.3)', gap: 6 }}
                >
                  <LogOut size={13} /> Leave Group
                </button>
              </div>

              {/* Time Window Tabs */}
              <div className="glass" style={{ borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { id: 'this_week', label: 'This Week' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'all_time', label: 'All Time' },
                  ].map(w => (
                    <button
                      key={w.id}
                      onClick={() => setWindowType(w.id)}
                      style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer',
                        background: windowType === w.id ? 'var(--accent)' : 'transparent',
                        color: windowType === w.id ? '#0D1117' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)', transition: 'all 0.15s ease'
                      }}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>

                {leaderboardLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    <RefreshCw size={12} className="animate-spin" /> Updating…
                  </div>
                )}
              </div>

              {/* Leaderboard Table */}
              <div className="glass" style={{ borderRadius: 8, overflow: 'hidden' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 16px', width: 60 }}>RANK</th>
                      <th style={{ padding: '12px 16px' }}>MEMBER (CLICK TO VIEW PROFILE)</th>
                      <th style={{ padding: '12px 16px' }}>DISTINCT SOLVED</th>
                      <th style={{ padding: '12px 16px' }}>STREAK</th>
                      <th style={{ padding: '12px 16px' }}>WEEKLY GOAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.leaderboard.map((entry, idx) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                      return (
                        <tr
                          key={entry.userId}
                          onClick={() => handleOpenMemberProfile(entry.userId)}
                          title="Click to view detailed member profile"
                          style={{
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Rank */}
                          <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: idx < 3 ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {medal}
                          </td>

                          {/* Member */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)',
                                border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 800, color: 'var(--accent)'
                              }}>
                                {entry.username.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', textDecoration: 'underline', marginBottom: 2 }}>
                                  {entry.username}
                                </div>
                                <div style={{ display: 'flex', gap: 8, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                  {entry.handles.leetcode && <span>LC: @{entry.handles.leetcode}</span>}
                                  {entry.handles.codeforces && <span>CF: @{entry.handles.codeforces}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Solved */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                              {entry.totalSolved}
                            </span>
                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 6 }}>
                              ({entry.lcCount} LC · {entry.cfCount} CF)
                            </span>
                          </td>

                          {/* Streak */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                              <Flame size={14} /> {entry.streak}d
                            </div>
                          </td>

                          {/* Weekly Goal */}
                          <td style={{ padding: '14px 16px', minWidth: 160 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-mono)', marginBottom: 4, color: 'var(--text-muted)' }}>
                              <span>{entry.totalSolved} / {entry.weeklyTarget} solved</span>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.targetPercent}%</span>
                            </div>
                            <div className="progress-bar" style={{ height: 6, background: 'var(--bg-muted)' }}>
                              <div className="progress-fill" style={{ width: `${entry.targetPercent}%`, background: entry.targetPercent >= 100 ? 'var(--cf-green)' : 'var(--accent)' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass" style={{ borderRadius: 8, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={36} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No Study Group Selected</h2>
              <p style={{ fontSize: 13, maxWidth: 360, margin: '0 auto' }}>
                Select a group from the left panel to view live member leaderboards.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Group Member Detailed Profile */}
      {selectedMemberId && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6, 9, 26, 0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="glass animate-fade-in" style={{ borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-surface)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', border: '1px solid var(--border-hover)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Group Member Profile</h3>
              </div>
              <button onClick={() => { setSelectedMemberId(null); setMemberProfileData(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {memberProfileLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--accent)' }} />
                  <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Fetching member profile details…</p>
                </div>
              ) : memberProfileData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* User Header */}
                  <div className="glass" style={{ borderRadius: 10, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent) 0%, #ff5252 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff'
                      }}>
                        {memberProfileData.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{memberProfileData.username}</h2>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                          {memberProfileData.cfRank && (
                            <span style={{ color: getRankColor(memberProfileData.cfRank), fontWeight: 700 }}>
                              {memberProfileData.cfRank} ({memberProfileData.cfRating} max {memberProfileData.cfMaxRating})
                            </span>
                          )}
                          {memberProfileData.handles.leetcode && <span style={{ color: 'var(--text-muted)' }}>LC: @{memberProfileData.handles.leetcode}</span>}
                          {memberProfileData.handles.codeforces && <span style={{ color: 'var(--text-muted)' }}>CF: @{memberProfileData.handles.codeforces}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stat Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="grid-stats-3">
                    <div className="glass" style={{ padding: 14, borderRadius: 8, textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>TOTAL SOLVED</span>
                      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>{memberProfileData.stats.totalSolved}</p>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{memberProfileData.stats.lcCount} LC · {memberProfileData.stats.cfCount} CF</span>
                    </div>

                    <div className="glass" style={{ padding: 14, borderRadius: 8, textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>CURRENT STREAK</span>
                      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--cf-green)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Flame size={16} /> {memberProfileData.stats.currentStreak ?? 0}d
                      </p>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Max: {memberProfileData.stats.maxStreak ?? 0}d</span>
                    </div>

                    <div className="glass" style={{ padding: 14, borderRadius: 8, textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>DIFFICULTY</span>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                        <span style={{ color: 'var(--cf-green)' }}>{memberProfileData.stats.easyCount}E</span> · <span style={{ color: 'var(--lc-yellow)' }}>{memberProfileData.stats.mediumCount}M</span> · <span style={{ color: 'var(--cf-red)' }}>{memberProfileData.stats.hardCount}H</span>
                      </p>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Breakdown</span>
                    </div>
                  </div>

                  {/* Topic Roadmap Progress */}
                  {memberProfileData.roadmapSummaries && memberProfileData.roadmapSummaries.length > 0 && (
                    <div className="glass" style={{ borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Map size={15} style={{ color: 'var(--accent)' }} />
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Topic Roadmap Progress</h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {memberProfileData.roadmapSummaries.map(rm => (
                          <div key={rm.title} style={{ background: 'var(--bg-base)', padding: '8px 12px', borderRadius: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                              <span>{rm.title}</span>
                              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{rm.solvedCount}/{rm.totalProblems} ({rm.percent}%)</span>
                            </div>
                            <div className="progress-bar" style={{ height: 5, background: 'var(--bg-muted)' }}>
                              <div className="progress-fill" style={{ width: `${rm.percent}%`, background: 'var(--accent)' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Earned Achievements / Badges */}
                  {memberProfileData.badges && memberProfileData.badges.length > 0 && (
                    <div className="glass" style={{ borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Award size={15} style={{ color: 'var(--accent)' }} />
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Earned Achievements ({memberProfileData.badges.length})</h4>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                        {memberProfileData.badges.map(b => (
                          <div key={b.id || b.name} style={{ background: 'var(--bg-base)', padding: '8px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{b.icon || '🏆'}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 }}>{b.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Unable to display member profile.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Create Group */}
      {modalType === 'create' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6, 9, 26, 0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="glass animate-fade-in" style={{ borderRadius: 10, width: '100%', maxWidth: 420, padding: 24, background: 'var(--bg-surface)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', border: '1px solid var(--border-hover)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Create New Study Group</h3>
              <button onClick={() => setModalType('none')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. Blind 75 Squad / CP Masters"
                  className="input-field"
                  required
                  maxLength={50}
                  style={{ width: '100%', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn-ghost" onClick={() => setModalType('none')} style={{ fontSize: 12 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ fontSize: 12 }}>
                  {submitting ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Join Group */}
      {modalType === 'join' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6, 9, 26, 0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="glass animate-fade-in" style={{ borderRadius: 10, width: '100%', maxWidth: 420, padding: 24, background: 'var(--bg-surface)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', border: '1px solid var(--border-hover)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Join Study Group</h3>
              <button onClick={() => setModalType('none')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleJoinGroup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Group Invite Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="e.g. GRP-9A2K7F"
                  className="input-field"
                  required
                  style={{ width: '100%', fontSize: 13, fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn-ghost" onClick={() => setModalType('none')} style={{ fontSize: 12 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ fontSize: 12 }}>
                  {submitting ? 'Joining…' : 'Join Group'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
