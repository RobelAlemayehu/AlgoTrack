import React, { useState, useEffect } from 'react';
import { Code, Save, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

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

export default function SettingsView({ userSettings, setUserSettings, token, showPopup }) {
  const [form, setForm] = useState({ leetcodeHandle: '', codeforcesHandle: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error'|'info', msg }

  useEffect(() => {
    setForm(userSettings || { leetcodeHandle: '', codeforcesHandle: '' });
  }, [userSettings]);

  const handleSave = async () => {
    setLoading(true);
    setStatus({ type: 'info', msg: 'Saving handles…' });

    try {
      const res = await fetch('https://algotrack-1.onrender.com/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ handles: { leetcode: form.leetcodeHandle, codeforces: form.codeforcesHandle } })
      });

      if (!res.ok) throw new Error('Failed to save profile');

      const oldSettings = { ...userSettings };
      setUserSettings(form);
      const hasChanged = oldSettings.leetcodeHandle !== form.leetcodeHandle || oldSettings.codeforcesHandle !== form.codeforcesHandle;

      if (!hasChanged) {
        setStatus({ type: 'success', msg: 'Settings saved — no changes detected.' });
        setLoading(false);
        return;
      }

      // Reset old data
      setStatus({ type: 'info', msg: 'Resetting old data...' });
      try {
        await fetch('https://algotrack-1.onrender.com/api/sync/reset', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch { /* continue anyway */ }

      // Sync both platforms
      let lcSyncResult = null;
      let cfSyncResult = null;
      const errors = [];
      const successes = [];

      if (form.codeforcesHandle) {
        setStatus({ type: 'info', msg: 'Syncing Codeforces...' });
        try {
          const r = await fetch(`https://algotrack-1.onrender.com/api/sync/codeforces?handle=${form.codeforcesHandle}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (r.ok) { cfSyncResult = await r.json(); successes.push(`Codeforces (${cfSyncResult.count || 0} problems)`); }
          else { const e = await r.json(); errors.push(`Codeforces: ${e.msg || e.error || 'Sync failed'}`); }
        } catch { errors.push('Codeforces: Network error'); }
      }

      if (form.leetcodeHandle) {
        setStatus({ type: 'info', msg: 'Syncing LeetCode...' });
        try {
          const r = await fetch('https://algotrack-1.onrender.com/api/sync/leetcode', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle: form.leetcodeHandle })
          });
          if (r.ok) { lcSyncResult = await r.json(); successes.push(`LeetCode (${lcSyncResult.countSynced || 0} synced, ${lcSyncResult.lcStats?.total || 0} total)`); }
          else { const e = await r.json(); errors.push(`LeetCode: ${e.msg || e.error || 'Sync failed'}`); }
        } catch { errors.push('LeetCode: Network error'); }
      }

      // Fetch updated problems and broadcast with all profile data
      const probRes = await fetch('https://algotrack-1.onrender.com/api/sync/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const probData = await probRes.json();
      window.dispatchEvent(new CustomEvent('dataUpdated', { detail: {
        problems:    Array.isArray(probData) ? probData : [],
        lcStats:     lcSyncResult?.lcStats     || null,
        lcCalendar:  null, // fetched fresh on next fetchData
        cfRating:    cfSyncResult?.cfRating    || 0,
        cfMaxRating: cfSyncResult?.cfMaxRating || 0,
        cfRank:      cfSyncResult?.cfRank      || ''
      } }));

      if (errors.length > 0 && successes.length === 0) {
        setStatus({ type: 'error', msg: `Sync Failed: ${errors.join(' · ')}` });
        showPopup?.('Sync Failed', errors.join('\n'), 'error');
      } else if (errors.length > 0) {
        setStatus({ type: 'error', msg: `Partial sync: ${successes.join(', ')} synced. Errors: ${errors.join(', ')}` });
        showPopup?.('Partial Sync', `Synced: ${successes.join(', ')}\nErrors: ${errors.join(', ')}`, 'warning');
      } else {
        setStatus({ type: 'success', msg: `Successfully synced: ${successes.join(', ')}` });
        showPopup?.('Sync Complete!', `Synced: ${successes.join(', ')}`, 'success');
      }
    } catch (err) {
      setStatus({ type: 'error', msg: `Error: ${err.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 8000);
    }
  };

  const platforms = [
    {
      key: 'leetcodeHandle',
      label: 'LeetCode',
      placeholder: 'e.g. rovel  or  https://leetcode.com/u/rovel',
      color: 'var(--orange)',
      bg: 'var(--orange-dim)',
      link: form.leetcodeHandle ? `https://leetcode.com/u/${form.leetcodeHandle}` : null,
      platform: 'LeetCode',
    },
    {
      key: 'codeforcesHandle',
      label: 'Codeforces',
      placeholder: 'e.g. tourist  or  https://codeforces.com/profile/tourist',
      color: 'var(--blue)',
      bg: 'var(--blue-dim)',
      link: form.codeforcesHandle ? `https://codeforces.com/profile/${form.codeforcesHandle}` : null,
      platform: 'Codeforces',
    },
  ];

  return (
    <div className="animate-fade-in settings-wrap view-pad" style={{ padding: '28px 32px', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Connect your competitive programming profiles</p>
        </div>
        {status && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: status.type === 'success' ? 'var(--emerald-dim)' : status.type === 'error' ? 'var(--red-dim)' : 'var(--indigo-dim)',
            color: status.type === 'success' ? 'var(--emerald)' : status.type === 'error' ? 'var(--red)' : 'var(--indigo-light)',
            border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.2)' : status.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`,
            maxWidth: 340
          }}>
            {status.type === 'success' ? <CheckCircle2 size={13} /> : status.type === 'error' ? <AlertCircle size={13} /> : <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
            <span>{status.msg}</span>
          </div>
        )}
      </div>

      {/* Platform handles */}
      <div className="glass" style={{ borderRadius: 14, padding: '22px 24px' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Platform Handles</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Paste your username or full profile URL — we'll extract it automatically.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {platforms.map(p => (
            <div key={p.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: form[p.key] ? p.color : 'var(--text-muted)' }} />
                  {p.label}
                  {form[p.key] && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Connected as <strong style={{ color: p.color }}>{form[p.key]}</strong></span>}
                </label>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <ExternalLink size={11} /> View Profile
                  </a>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Code size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: form[p.key] ? p.color : 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 36 }}
                  placeholder={p.placeholder}
                  value={form[p.key]}
                  onChange={e => setForm({ ...form, [p.key]: extractUsername(e.target.value, p.platform) })}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saving will reset old data and re-sync everything.</p>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={loading || (!form.leetcodeHandle && !form.codeforcesHandle)}
            style={{ fontSize: 13 }}
          >
            {loading ? <><RefreshCw size={13} className="animate-spin" /> Syncing…</> : <><Save size={13} /> Save & Sync</>}
          </button>
        </div>
      </div>
    </div>
  );
}
