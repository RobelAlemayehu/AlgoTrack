import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle2, AlertCircle, Download, Sun, Moon, RotateCcw, Sliders, Globe, Copy, ExternalLink, Eye, Trash2, AlertTriangle } from 'lucide-react';

const API = import.meta.env.VITE_API || 'http://localhost:5000';

export default function SettingsView({ userSettings, token, showPopup, theme, onThemeToggle, onOpenDeleteModal }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [archivedCount, setArchivedCount] = useState(0);

  useEffect(() => {
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

  const handleForceResync = async () => {
    setLoading(true);
    setStatus({ type: 'info', msg: 'Force-resyncing all Codeforces & LeetCode data…' });
    try {
      if (userSettings?.codeforcesHandle) {
        await fetch(`${API}/api/sync/codeforces?handle=${userSettings.codeforcesHandle}&force=true`, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (userSettings?.leetcodeHandle) {
        await fetch(`${API}/api/sync/leetcode`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: userSettings.leetcodeHandle })
        });
      }
      const probRes = await fetch(`${API}/api/sync/all`, { headers: { Authorization: `Bearer ${token}` } });
      const probData = await probRes.json();
      window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { problems: Array.isArray(probData) ? probData : (probData.problems || []) } }));
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
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { problems: Array.isArray(probData) ? probData : (probData.problems || []) } }));
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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showPopup?.('Account Deleted', 'Your account has been deleted.', 'info');
        onLogout?.();
      } else {
        showPopup?.('Deletion Failed', data.msg || 'Could not delete account.', 'error');
        setDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (err) {
      showPopup?.('Error', 'Network error while deleting account.', 'error');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '24px 28px', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>System Settings</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Manage app preferences, theme &amp; data operations</p>
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

      {/* App Preferences & Theme Panel */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={15} style={{ color: 'var(--accent)' }} /> App Preferences
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Customize interface appearance and display options.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Interface Theme</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Switch between Dark Charcoal and Light Mode</div>
            </div>
            <button className="btn-ghost" onClick={onThemeToggle} style={{ fontSize: 12, gap: 6 }}>
              {theme === 'dark' ? <Sun size={14} style={{ color: 'var(--lc-yellow)' }} /> : <Moon size={14} style={{ color: 'var(--accent)' }} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Public Profile Settings Panel */}
      <PublicProfileSettingsPanel token={token} showPopup={showPopup} />

      {/* Force Resync & Recovery Panel */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={15} style={{ color: 'var(--accent)' }} /> Sync Operations &amp; Recovery
        </h2>
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
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={15} style={{ color: 'var(--accent)' }} /> Export Problem Data
        </h2>
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

      {/* Danger Zone Panel */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px', borderColor: 'rgba(255, 123, 114, 0.3)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cf-red)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} /> Danger Zone
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Permanently deactivate your user account and log out.
        </p>
        <div>
          <button
            onClick={onOpenDeleteModal}
            style={{
              padding: '7px 14px', borderRadius: 6,
              background: 'var(--red-dim)', color: 'var(--cf-red)',
              border: '1px solid rgba(255, 123, 114, 0.4)',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Trash2 size={13} /> Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicProfileSettingsPanel({ token, showPopup }) {
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState('');
  const [views, setViews] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/public/config/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.publicProfile) {
          setEnabled(data.publicProfile.enabled || false);
          setSlug(data.publicProfile.slug || '');
          setViews(data.publicProfile.views || 0);
        }
      })
      .catch(console.error);
  }, [token]);

  const handleSavePublicProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/public/config/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled, slug })
      });
      const data = await res.json();
      if (res.ok) {
        showPopup?.('Public Profile Saved', 'Your public portfolio URL settings have been updated.', 'success');
        if (data.publicProfile) {
          setEnabled(data.publicProfile.enabled);
          setSlug(data.publicProfile.slug);
        }
      } else {
        showPopup?.('Update Failed', data.error || 'Could not update public profile.', 'error');
      }
    } catch (err) {
      showPopup?.('Error', 'Network error while updating public profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = `${window.location.origin}/#/u/${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    showPopup?.('Link Copied!', 'Public profile link copied to clipboard.', 'success');
  };

  return (
    <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Globe size={15} style={{ color: 'var(--accent)' }} /> Public Portfolio Profile
      </h2>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Share your verified problem solving metrics and accomplishments via a read-only public link.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Enable Public Profile Page</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Make your portfolio accessible via a shareable public URL</div>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: enabled ? 'var(--accent)' : 'var(--bg-muted)',
                borderRadius: 24, transition: '0.2s'
              }}
            >
              <span
                style={{
                  position: 'absolute', content: '""', height: 18, width: 18, left: enabled ? 22 : 3, bottom: 3,
                  backgroundColor: '#fff', borderRadius: '50%', transition: '0.2s'
                }}
              />
            </span>
          </label>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
            Custom Profile URL Handle / Slug
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {window.location.origin}/#/u/
            </span>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className="input-field"
              style={{ flex: 1, fontSize: 13, background: 'var(--bg-base)' }}
              placeholder="your-username"
            />
          </div>
        </div>

        {enabled && slug && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {views} Public Profile Views
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={handleCopyLink} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}>
                <Copy size={12} /> Copy Link
              </button>
              <a href={`/#/u/${slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}>
                Preview <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={handleSavePublicProfile} disabled={saving} className="btn-primary" style={{ fontSize: 12, gap: 6 }}>
            <Save size={13} /> {saving ? 'Saving...' : 'Save Public Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
