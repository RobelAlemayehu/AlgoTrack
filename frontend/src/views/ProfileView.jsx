import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Save, Key, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import ShareProfileCard from '../components/ShareProfileCard';

const API = import.meta.env.VITE_API || 'http://localhost:5000';

const extractUsername = (input, platform) => {
  if (!input) return '';
  const clean = input.trim();
  if (!clean.includes('/')) return clean;
  try {
    const parts = clean.split('/').filter(Boolean);
    if (platform === 'LeetCode') {
      const uIdx = parts.indexOf('u');
      return uIdx !== -1 && uIdx < parts.length - 1 ? parts[uIdx + 1] : parts[parts.length - 1];
    }
    return parts[parts.length - 1];
  } catch { return clean; }
};

export default function ProfileView({ userSettings, setUserSettings, token, showPopup, onDataRefresh, user, totalSolved, lcStats, problems, streak }) {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [handlesForm, setHandlesForm] = useState({ leetcodeHandle: '', codeforcesHandle: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [handlesLoading, setHandlesLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [token]);

  useEffect(() => {
    setHandlesForm({
      leetcodeHandle:   userSettings?.leetcodeHandle   || '',
      codeforcesHandle: userSettings?.codeforcesHandle || ''
    });
  }, [userSettings]);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setUsername(data.username || '');
      }
    } catch (e) {}
  };

  // ── Platform Handles Save & Sync ─────────────────────────────────────────
  const checkHandleChange = () => {
    const oldSettings = { ...userSettings };
    const hasChanged = oldSettings.leetcodeHandle !== handlesForm.leetcodeHandle || oldSettings.codeforcesHandle !== handlesForm.codeforcesHandle;
    if (hasChanged && (oldSettings.leetcodeHandle || oldSettings.codeforcesHandle)) {
      setShowConfirmModal(true);
    } else {
      executeSaveAndSync();
    }
  };

  const executeSaveAndSync = async () => {
    setShowConfirmModal(false);
    setHandlesLoading(true);
    setStatus({ type: 'info', msg: 'Saving platform handles…' });

    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ handles: {
          leetcode:   handlesForm.leetcodeHandle,
          codeforces: handlesForm.codeforcesHandle
        } })
      });

      if (!res.ok) throw new Error('Failed to save platform handles');

      const oldSettings = { ...userSettings };
      setUserSettings(handlesForm);
      try {
        const cachedUser = JSON.parse(localStorage.getItem('user')) || {};
        cachedUser.handles = {
          leetcode: handlesForm.leetcodeHandle,
          codeforces: handlesForm.codeforcesHandle
        };
        localStorage.setItem('user', JSON.stringify(cachedUser));
      } catch {}
      const hasChanged = oldSettings.leetcodeHandle !== handlesForm.leetcodeHandle || oldSettings.codeforcesHandle !== handlesForm.codeforcesHandle;

      if (hasChanged) {
        setStatus({ type: 'info', msg: 'Archiving existing records (30-day recovery active)…' });
        try {
          await fetch(`${API}/api/sync/reset`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch { /* continue */ }
      }

      // Sync platforms
      let lcSyncResult = null;
      let cfSyncResult = null;
      const errors = [];
      const successes = [];

      if (handlesForm.codeforcesHandle) {
        setStatus({ type: 'info', msg: 'Syncing Codeforces submissions…' });
        try {
          const r = await fetch(`${API}/api/sync/codeforces?handle=${handlesForm.codeforcesHandle}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (r.ok) { cfSyncResult = await r.json(); successes.push(`Codeforces (${cfSyncResult.count || 0} solved)`); }
          else { const e = await r.json(); errors.push(`Codeforces: ${e.msg || 'Sync error'}`); }
        } catch { errors.push('Codeforces network error'); }
      }

      if (handlesForm.leetcodeHandle) {
        setStatus({ type: 'info', msg: 'Syncing LeetCode submissions…' });
        try {
          const r = await fetch(`${API}/api/sync/leetcode`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle: handlesForm.leetcodeHandle })
          });
          if (r.ok) { lcSyncResult = await r.json(); successes.push(`LeetCode (${lcSyncResult.countSynced || 0} synced)`); }
          else { const e = await r.json(); errors.push(`LeetCode: ${e.msg || 'Sync error'}`); }
        } catch { errors.push('LeetCode network error'); }
      }

      onDataRefresh?.();

      if (errors.length > 0 && successes.length === 0) {
        setStatus({ type: 'error', msg: `Sync Failed: ${errors.join(' · ')}` });
      } else {
        setStatus({ type: 'success', msg: `Synced successfully: ${successes.join(', ')}` });
        showPopup?.('Sync Complete!', `Synced: ${successes.join(', ')}`, 'success');
      }
    } catch (err) {
      setStatus({ type: 'error', msg: `Error: ${err.message}` });
    } finally {
      setHandlesLoading(false);
      setTimeout(() => setStatus(null), 6000);
    }
  };

  // ── Update Username ───────────────────────────────────────────────────────
  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setUserLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/auth/username`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: username.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Failed to update username');

      showPopup?.('Username Updated', 'Your username was successfully updated.', 'success');
      setStatus({ type: 'success', msg: 'Username updated!' });
      onDataRefresh?.();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setUserLoading(false);
    }
  };

  // ── Update Password ───────────────────────────────────────────────────────
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus({ type: 'error', msg: 'New password and confirm password do not match.' });
      return;
    }
    setPassLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${API}/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Failed to update password');

      showPopup?.('Password Updated', 'Your account password has been changed.', 'success');
      setStatus({ type: 'success', msg: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setPassLoading(false);
    }
  };

  const passwordsMatch = passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword;
  const canSubmitPassword = passwordForm.currentPassword && passwordForm.newPassword && passwordsMatch;

  const platforms = [
    {
      key: 'leetcodeHandle',
      label: 'LeetCode Handle',
      placeholder: 'e.g. rovel  or  https://leetcode.com/u/rovel',
      link: handlesForm.leetcodeHandle ? `https://leetcode.com/u/${handlesForm.leetcodeHandle}` : null,
      platform: 'LeetCode',
    },
    {
      key: 'codeforcesHandle',
      label: 'Codeforces Handle',
      placeholder: 'e.g. tourist  or  https://codeforces.com/profile/tourist',
      link: handlesForm.codeforcesHandle ? `https://codeforces.com/profile/${handlesForm.codeforcesHandle}` : null,
      platform: 'Codeforces',
    },
  ];

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '24px 28px', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Account Profile</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Manage competitive programming handles &amp; personal identity</p>
        </div>
        {status && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: status.type === 'success' ? 'var(--emerald-dim)' : status.type === 'error' ? 'var(--red-dim)' : 'var(--accent-dim)',
            color: status.type === 'success' ? 'var(--cf-green)' : status.type === 'error' ? 'var(--cf-red)' : 'var(--accent)',
            border: `1px solid ${status.type === 'success' ? 'rgba(63,185,80,0.3)' : status.type === 'error' ? 'rgba(255,123,114,0.3)' : 'rgba(240,136,62,0.3)'}`,
          }}>
            {status.type === 'success' ? <CheckCircle2 size={13} /> : status.type === 'error' ? <AlertCircle size={13} /> : <RefreshCw size={13} className="animate-spin" />}
            <span>{status.msg}</span>
          </div>
        )}
      </div>

      {/* Platform Profiles Panel */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Platform Profiles</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Paste your handle or profile URL — handles are extracted automatically.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {platforms.map(p => (
            <div key={p.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {p.label}
                  {handlesForm[p.key] && <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>@{handlesForm[p.key]}</span>}
                </label>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, textDecoration: 'none' }}>
                    <ExternalLink size={11} /> Profile
                  </a>
                )}
              </div>
              <input
                className="input-field"
                placeholder={p.placeholder}
                value={handlesForm[p.key]}
                onChange={e => setHandlesForm({ ...handlesForm, [p.key]: extractUsername(e.target.value, p.platform) })}
                style={{ fontSize: 13 }}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Handle changes automatically soft-archive previous records for 30 days.</p>
          <button
            className="btn-primary"
            onClick={checkHandleChange}
            disabled={handlesLoading || (!handlesForm.leetcodeHandle && !handlesForm.codeforcesHandle)}
            style={{ fontSize: 12 }}
          >
            {handlesLoading ? <><RefreshCw size={13} className="animate-spin" /> Syncing…</> : <><Save size={13} /> Save &amp; Sync</>}
          </button>
        </div>
      </div>

      {/* Identity Info Card */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={15} style={{ color: 'var(--accent)' }} /> Profile Identity
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email Address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text-primary)' }}>
              <Mail size={14} style={{ color: 'var(--text-muted)' }} />
              <span>{profile?.email || '—'}</span>
            </div>
          </div>

          <form onSubmit={handleUpdateUsername}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Username</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="input-field"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
              <button className="btn-primary" type="submit" disabled={userLoading || !username.trim()}>
                {userLoading ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />} Save
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Key size={15} style={{ color: 'var(--accent)' }} /> Security &amp; Password
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Update your account password. Requires current password verification.
        </p>

        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showCurrentPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                style={{ paddingRight: 36, width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2
                }}
                title={showCurrentPass ? 'Hide password' : 'Show password'}
              >
                {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showNewPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                style={{ paddingRight: 36, width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2
                }}
                title={showNewPass ? 'Hide password' : 'Show password'}
              >
                {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showConfirmPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                style={{ paddingRight: 36, width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2
                }}
                title={showConfirmPass ? 'Hide password' : 'Show password'}
              >
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordForm.confirmPassword && !passwordsMatch && (
              <p style={{ fontSize: 11, color: 'var(--cf-red)', marginTop: 4 }}>New password and confirm password do not match.</p>
            )}
          </div>

          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" type="submit" disabled={passLoading || !canSubmitPassword}>
              {passLoading ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />} Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Shareable Profile Card */}
      <ShareProfileCard
        user={profile || user}
        totalSolved={totalSolved}
        lcCount={(problems || []).filter(p => !p.archived && p.platform === 'LeetCode').length}
        cfCount={(problems || []).filter(p => !p.archived && p.platform === 'Codeforces').length}
        streak={streak}
        badgesCount={profile?.badges?.length || (totalSolved > 50 ? 3 : totalSolved > 10 ? 2 : 1)}
        showPopup={showPopup}
      />

      {/* Safer Handle Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)', marginBottom: 12 }}>
              <ShieldAlert size={20} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Confirm Handle Change</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              You are updating your platform handle. Existing problem records will be soft-archived and preserved for 30 days so your notes and custom tags are never lost.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setShowConfirmModal(false)} style={{ fontSize: 12 }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={executeSaveAndSync} style={{ fontSize: 12 }}>
                Proceed &amp; Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
