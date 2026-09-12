import React, { useState, useEffect } from 'react';
import { Code, Save, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Download, Sun, Moon, ShieldAlert, RotateCcw } from 'lucide-react';

const API = import.meta.env.VITE_API || 'https://algotrack-1.onrender.com';

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

export default function SettingsView({ userSettings, setUserSettings, token, showPopup, theme, onThemeToggle }) {
  const [form, setForm] = useState({ leetcodeHandle: '', codeforcesHandle: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);

  useEffect(() => {
    setForm({
      leetcodeHandle:   userSettings?.leetcodeHandle   || '',
      codeforcesHandle: userSettings?.codeforcesHandle || ''
    });
    fetchArchivedInfo();
  }, [userSettings]);

  const fetchArchivedInfo = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/sync/archived`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setArchivedCount(data.count || 0);
      }
    } catch (e) {}
  };

  const checkHandleChange = () => {
    const oldSettings = { ...userSettings };
    const hasChanged = oldSettings.leetcodeHandle !== form.leetcodeHandle || oldSettings.codeforcesHandle !== form.codeforcesHandle;
    if (hasChanged && (oldSettings.leetcodeHandle || oldSettings.codeforcesHandle)) {
      setShowConfirmModal(true);
    } else {
      executeSaveAndSync();
    }
  };

  const executeSaveAndSync = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setStatus({ type: 'info', msg: 'Saving profile settings…' });

    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ handles: {
          leetcode:   form.leetcodeHandle,
          codeforces: form.codeforcesHandle
        } })
      });

      if (!res.ok) throw new Error('Failed to save profile');

      const oldSettings = { ...userSettings };
      setUserSettings(form);
      const hasChanged = oldSettings.leetcodeHandle !== form.leetcodeHandle || oldSettings.codeforcesHandle !== form.codeforcesHandle;

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

      if (form.codeforcesHandle) {
        setStatus({ type: 'info', msg: 'Syncing Codeforces submissions…' });
        try {
          const r = await fetch(`${API}/api/sync/codeforces?handle=${form.codeforcesHandle}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (r.ok) { cfSyncResult = await r.json(); successes.push(`Codeforces (${cfSyncResult.count || 0} solved)`); }
          else { const e = await r.json(); errors.push(`Codeforces: ${e.msg || 'Sync error'}`); }
        } catch { errors.push('Codeforces network error'); }
      }

      if (form.leetcodeHandle) {
        setStatus({ type: 'info', msg: 'Syncing LeetCode submissions…' });
        try {
          const r = await fetch(`${API}/api/sync/leetcode`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle: form.leetcodeHandle })
          });
          if (r.ok) { lcSyncResult = await r.json(); successes.push(`LeetCode (${lcSyncResult.countSynced || 0} synced)`); }
          else { const e = await r.json(); errors.push(`LeetCode: ${e.msg || 'Sync error'}`); }
        } catch { errors.push('LeetCode network error'); }
      }

      // Refresh problem list
      const probRes = await fetch(`${API}/api/sync/all`, { headers: { Authorization: `Bearer ${token}` } });
      const probData = await probRes.json();
      window.dispatchEvent(new CustomEvent('dataUpdated', { detail: {
        problems: Array.isArray(probData) ? probData : [],
        lcStats: lcSyncResult?.lcStats || null,
        cfRating: cfSyncResult?.cfRating || 0,
        cfMaxRating: cfSyncResult?.cfMaxRating || 0,
        cfRank: cfSyncResult?.cfRank || ''
      } }));

      fetchArchivedInfo();

      if (errors.length > 0 && successes.length === 0) {
        setStatus({ type: 'error', msg: `Sync Failed: ${errors.join(' · ')}` });
      } else {
        setStatus({ type: 'success', msg: `Synced successfully: ${successes.join(', ')}` });
        showPopup?.('Sync Complete!', `Synced: ${successes.join(', ')}`, 'success');
      }
    } catch (err) {
      setStatus({ type: 'error', msg: `Error: ${err.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 6000);
    }
  };

  const handleForceResync = async () => {
    setLoading(true);
    setStatus({ type: 'info', msg: 'Force-resyncing all Codeforces & LeetCode data…' });
    try {
      if (form.codeforcesHandle) {
        await fetch(`${API}/api/sync/codeforces?handle=${form.codeforcesHandle}&force=true`, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (form.leetcodeHandle) {
        await fetch(`${API}/api/sync/leetcode`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: form.leetcodeHandle })
        });
      }
      const probRes = await fetch(`${API}/api/sync/all`, { headers: { Authorization: `Bearer ${token}` } });
      const probData = await probRes.json();
      window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { problems: Array.isArray(probData) ? probData : [] } }));
      setStatus({ type: 'success', msg: 'Force resync completed!' });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Force resync failed.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const handleRestoreArchived = async () => {
    try {
      const res = await fetch(`${API}/api/sync/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        showPopup?.('Restored', `Restored ${data.restoredCount} archived problems.`, 'success');
        fetchArchivedInfo();
        const probRes = await fetch(`${API}/api/sync/all`, { headers: { Authorization: `Bearer ${token}` } });
        const probData = await probRes.json();
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { problems: Array.isArray(probData) ? probData : [] } }));
      }
    } catch (e) {
      showPopup?.('Error', 'Failed to restore archived problems', 'error');
    }
  };

  const handleDownloadExport = async (format) => {
    try {
      const res = await fetch(`${API}/api/sync/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `algotrack_export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.open(`${API}/api/sync/export?format=${format}&token=${token}`, '_blank');
    }
  };

  const platforms = [
    {
      key: 'leetcodeHandle',
      label: 'LeetCode Handle',
      placeholder: 'e.g. rovel  or  https://leetcode.com/u/rovel',
      link: form.leetcodeHandle ? `https://leetcode.com/u/${form.leetcodeHandle}` : null,
      platform: 'LeetCode',
    },
    {
      key: 'codeforcesHandle',
      label: 'Codeforces Handle',
      placeholder: 'e.g. tourist  or  https://codeforces.com/profile/tourist',
      link: form.codeforcesHandle ? `https://codeforces.com/profile/${form.codeforcesHandle}` : null,
      platform: 'Codeforces',
    },
  ];

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '24px 28px', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Account Settings</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Manage competitive programming handles & data preferences</p>
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

      {/* Handles Panel */}
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
                  {form[p.key] && <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>@{form[p.key]}</span>}
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
                value={form[p.key]}
                onChange={e => setForm({ ...form, [p.key]: extractUsername(e.target.value, p.platform) })}
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
            disabled={loading || (!form.leetcodeHandle && !form.codeforcesHandle)}
            style={{ fontSize: 12 }}
          >
            {loading ? <><RefreshCw size={13} className="animate-spin" /> Syncing…</> : <><Save size={13} /> Save &amp; Sync</>}
          </button>
        </div>
      </div>

      {/* Force Resync & Recovery Panel */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Sync Operations & Recovery</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Perform full resyncs or restore archived problem history.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={handleForceResync} disabled={loading} style={{ fontSize: 12 }}>
            <RefreshCw size={13} /> Force Full Resync
          </button>

          {archivedCount > 0 && (
            <button className="btn-ghost" onClick={handleRestoreArchived} style={{ fontSize: 12, color: 'var(--accent)', borderColor: 'rgba(240,136,62,0.4)' }}>
              <RotateCcw size={13} /> Restore {archivedCount} Archived Problems
            </button>
          )}
        </div>
      </div>

      {/* Export Data Panel */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Export Problem Data</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Download a full backup copy of your solved problems, code snippets, and notes.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={() => handleDownloadExport('json')} style={{ fontSize: 12 }}>
            <Download size={13} /> Export JSON
          </button>
          <button className="btn-ghost" onClick={() => handleDownloadExport('csv')} style={{ fontSize: 12 }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Safer Handle Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300
        }}>
          <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 8, border: '1px solid var(--border)' }}>
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
