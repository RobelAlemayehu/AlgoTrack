import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Activity, CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight,
  Shield, AlertTriangle, RefreshCw, Database
} from 'lucide-react';
import { API } from '../config/api';

export default function AdminView({ token, showPopup }) {
  const [stats, setStats] = useState(null);
  const [syncHealth, setSyncHealth] = useState(null);
  const [usersData, setUsersData] = useState({ users: [], pagination: { page: 1, totalPages: 1, totalUsers: 0 } });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAdminData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    setAccessDenied(false);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, healthRes, usersRes] = await Promise.all([
        fetch(`${API}/api/admin/stats`, { headers }),
        fetch(`${API}/api/admin/sync-health`, { headers }),
        fetch(`${API}/api/admin/users?page=${page}&limit=50&search=${encodeURIComponent(searchQuery)}`, { headers })
      ]);

      if (statsRes.status === 403 || healthRes.status === 403 || usersRes.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (healthRes.ok) setSyncHealth(await healthRes.json());
      if (usersRes.ok) setUsersData(await usersRes.json());

    } catch (err) {
      console.error('Failed to load admin data:', err);
      setErrorMsg('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [token, page, searchQuery]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Debounced search reset page to 1
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  if (accessDenied) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div className="glass" style={{ padding: 40, borderRadius: 12, borderColor: 'var(--cf-red)' }}>
          <AlertTriangle size={48} style={{ color: 'var(--cf-red)', marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            403 - Access Denied
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            You do not have operator privileges to access the Admin Dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
            }}>
              <Shield size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Admin Dashboard
              </h1>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Operator visibility & telemetry (Read-only)
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="glass-hover"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 6,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh Telemetry
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 6, background: 'var(--red-dim)', border: '1px solid var(--cf-red)', color: 'var(--cf-red)', fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {/* ── Section 1: Platform Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {/* Total Users */}
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--blue-dim)', border: '1px solid var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)'
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Total Registered Users</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {loading ? '...' : (stats?.totalUsers ?? 0)}
            </div>
          </div>
        </div>

        {/* Active Users 7d */}
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--emerald-dim)', border: '1px solid var(--cf-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cf-green)'
          }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Active Users (7 Days)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {loading ? '...' : (stats?.activeUsers7d ?? 0)}
            </div>
          </div>
        </div>

        {/* Total Problems Tracked */}
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
          }}>
            <Database size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Total Problems Tracked</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {loading ? '...' : (stats?.totalProblemsTracked ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Sync Health Panel ── */}
      <div className="glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Sync Health Telemetry</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sync activity & failure logs across LeetCode & Codeforces</div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {/* 24h Badge */}
            <div style={{
              padding: '6px 12px', borderRadius: 6, background: 'var(--bg-muted)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: 'var(--font-mono)'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>24h:</span>
              <span style={{ color: 'var(--cf-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} /> {syncHealth?.syncs24h?.success ?? 0}
              </span>
              <span style={{ color: 'var(--cf-red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <XCircle size={13} /> {syncHealth?.syncs24h?.failure ?? 0}
              </span>
            </div>

            {/* 7d Badge */}
            <div style={{
              padding: '6px 12px', borderRadius: 6, background: 'var(--bg-muted)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: 'var(--font-mono)'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>7d:</span>
              <span style={{ color: 'var(--cf-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} /> {syncHealth?.syncs7d?.success ?? 0}
              </span>
              <span style={{ color: 'var(--cf-red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <XCircle size={13} /> {syncHealth?.syncs7d?.failure ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Failures List */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Recent Sync Failures {syncHealth?.recentFailures?.length ? `(${syncHealth.recentFailures.length})` : ''}
          </div>

          {(!syncHealth?.recentFailures || syncHealth.recentFailures.length === 0) ? (
            <div style={{ padding: 16, borderRadius: 6, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              ✓ No recent sync failures logged. All sync operations running cleanly.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <th style={{ padding: '8px 12px' }}>Timestamp</th>
                    <th style={{ padding: '8px 12px' }}>User</th>
                    <th style={{ padding: '8px 12px' }}>Platform</th>
                    <th style={{ padding: '8px 12px' }}>Error Message</th>
                  </tr>
                </thead>
                <tbody>
                  {syncHealth.recentFailures.map(fail => (
                    <tr key={fail.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fail.timestamp ? new Date(fail.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fail.user}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className="badge" style={{
                          background: fail.platform === 'leetcode' ? 'var(--orange-dim)' : 'var(--blue-dim)',
                          color: fail.platform === 'leetcode' ? 'var(--accent)' : 'var(--blue)'
                        }}>
                          {fail.platform}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--cf-red)', fontFamily: 'var(--font-mono)' }}>
                        {fail.errorMessage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Users Table ── */}
      <div className="glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Registered Accounts</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {usersData.users.length} of {usersData.pagination?.totalUsers || 0} users
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search username or email..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                width: '100%', padding: '7px 10px 7px 32px', borderRadius: 6,
                background: 'var(--bg-muted)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <th style={{ padding: '10px 12px' }}>User</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Email</th>
                <th style={{ padding: '10px 12px' }}>LeetCode</th>
                <th style={{ padding: '10px 12px' }}>Codeforces</th>
                <th style={{ padding: '10px 12px' }}>Joined</th>
                <th style={{ padding: '10px 12px' }}>Last Sync</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Solved</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading users data...
                  </td>
                </tr>
              ) : usersData.users.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                usersData.users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', opacity: u.isDeleted ? 0.75 : 1 }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.username}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {u.isDeleted ? (
                        <span className="badge" style={{ background: 'var(--red-dim)', color: 'var(--cf-red)', border: '1px solid rgba(255,123,114,0.3)' }}>
                          Deleted
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--emerald-dim)', color: 'var(--cf-green)', border: '1px solid rgba(63,185,80,0.3)' }}>
                          Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                      {u.handles?.leetcode ? (
                        <span style={{ color: 'var(--accent)' }}>{u.handles.leetcode}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                      {u.handles?.codeforces ? (
                        <span style={{ color: 'var(--cf-blue)' }}>{u.handles.codeforces}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                      <div>LC: {u.lastSync?.leetcode ? new Date(u.lastSync.leetcode).toLocaleDateString() : 'Never'}</div>
                      <div>CF: {u.lastSync?.codeforces ? new Date(u.lastSync.codeforces).toLocaleDateString() : 'Never'}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {u.totalSolved}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Page {usersData.pagination?.page || 1} of {usersData.pagination?.totalPages || 1}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              style={{
                padding: '6px 12px', borderRadius: 6,
                background: 'var(--bg-muted)', border: '1px solid var(--border)',
                color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <button
              onClick={() => setPage(p => Math.min(usersData.pagination?.totalPages || 1, p + 1))}
              disabled={page >= (usersData.pagination?.totalPages || 1) || loading}
              style={{
                padding: '6px 12px', borderRadius: 6,
                background: 'var(--bg-muted)', border: '1px solid var(--border)',
                color: page >= (usersData.pagination?.totalPages || 1) ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: page >= (usersData.pagination?.totalPages || 1) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
