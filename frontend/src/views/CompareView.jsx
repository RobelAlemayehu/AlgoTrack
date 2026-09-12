import React, { useState } from 'react';
import { Users, Search, TrendingUp, Code, Star, ExternalLink, BarChart3, Zap, Award } from 'lucide-react';

const API = import.meta.env.VITE_API || 'https://algotrack-1.onrender.com';

function StatBlock({ label, me, them }) {
  const meNum  = Number(me)  || 0;
  const themNum = Number(them) || 0;
  const meWins  = meNum >= themNum;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 700, color: meWins ? 'var(--cf-green)' : 'var(--text-primary)'
        }}>{me ?? '—'}</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', minWidth: 110 }}>
        {label}
      </div>
      <div>
        <span style={{
          fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 700, color: !meWins && themNum > meNum ? 'var(--accent)' : 'var(--text-primary)'
        }}>{them ?? '—'}</span>
      </div>
    </div>
  );
}

function TagBar({ tag, myCount, theirCount }) {
  const max = Math.max(myCount, theirCount, 1);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tag}</span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{myCount} vs {theirCount}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, height: 5 }}>
        <div style={{ flex: 1, background: 'var(--bg-base)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(myCount / max) * 100}%`, background: 'var(--cf-green)', borderRadius: 2 }} />
        </div>
        <div style={{ flex: 1, background: 'var(--bg-base)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(theirCount / max) * 100}%`, background: 'var(--accent)', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

export default function CompareView({ token }) {
  const [cfHandle, setCfHandle] = useState(() => localStorage.getItem('algotrack_compare_cf') || '');
  const [lcHandle, setLcHandle] = useState(() => localStorage.getItem('algotrack_compare_lc') || '');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  const updateCfHandle = (val) => {
    setCfHandle(val);
    if (val.trim()) localStorage.setItem('algotrack_compare_cf', val.trim());
    else localStorage.removeItem('algotrack_compare_cf');
  };

  const updateLcHandle = (val) => {
    setLcHandle(val);
    if (val.trim()) localStorage.setItem('algotrack_compare_lc', val.trim());
    else localStorage.removeItem('algotrack_compare_lc');
  };

  const handleCompare = async () => {
    if (!cfHandle && !lcHandle) { setError('Enter at least one handle to compare with.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const params = new URLSearchParams();
      if (cfHandle) params.set('cf', cfHandle);
      if (lcHandle) params.set('lc', lcHandle);
      const res  = await fetch(`${API}/api/sync/compare?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comparison failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const me   = result?.me;
  const them = result?.them;

  const allTags = result ? [...new Set([
    ...(me?.topTags   || []).map(t => t.tag),
    ...(them?.topTags || []).map(t => t.tag)
  ])].slice(0, 6) : [];

  const getTagCount = (stats, tag) => stats?.topTags?.find(t => t.tag === tag)?.count || 0;

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} style={{ color: 'var(--accent)' }} /> Peer Head-to-Head Comparison
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Compare solve stats and ratings against any programmer</p>
      </div>

      {/* Input panel */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Enter target user handles:</p>
        <div className="compare-inputs" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4 }}>CODEFORCES HANDLE</label>
            <input
              className="input-field"
              placeholder="e.g. tourist"
              value={cfHandle}
              onChange={e => updateCfHandle(e.target.value)}
              style={{ fontSize: 12 }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4 }}>LEETCODE HANDLE</label>
            <input
              className="input-field"
              placeholder="e.g. neetcode"
              value={lcHandle}
              onChange={e => updateLcHandle(e.target.value)}
              style={{ fontSize: 12 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-primary" onClick={handleCompare} disabled={loading} style={{ height: 34, fontSize: 12 }}>
              {loading ? 'Comparing…' : 'Compare Now'}
            </button>
          </div>
        </div>
        {error && <div style={{ fontSize: 12, color: 'var(--cf-red)', marginTop: 10 }}>{error}</div>}
      </div>

      {/* Comparison results */}
      {result && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass" style={{ borderRadius: 6, padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cf-green)' }}>You ({me?.username})</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>VS</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{them?.username || them?.handle || 'Opponent'}</div>
              </div>
            </div>

            <StatBlock label="Total Solved" me={me?.totalSolved} them={them?.totalSolved} />
            <StatBlock label="LeetCode Solved" me={me?.lcSolved ?? me?.lcTotal} them={them?.lcSolved ?? them?.lcTotal} />
            <StatBlock label="Codeforces Solved" me={me?.cfSolved ?? me?.cfTotal} them={them?.cfSolved ?? them?.cfTotal} />
            <StatBlock label="Codeforces Rating" me={me?.cfRating !== null && me?.cfRating !== undefined ? me?.cfRating : 'N/A'} them={them?.cfRating !== null && them?.cfRating !== undefined ? them?.cfRating : 'N/A'} />
            <StatBlock label="CF Max Rating" me={me?.cfMaxRating !== null && me?.cfMaxRating !== undefined ? me?.cfMaxRating : 'N/A'} them={them?.cfMaxRating !== null && them?.cfMaxRating !== undefined ? them?.cfMaxRating : 'N/A'} />
          </div>

          {/* Topic comparison */}
          {allTags.length > 0 && (
            <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Tag Distribution Comparison</h2>
              {allTags.map(tag => (
                <TagBar key={tag} tag={tag} myCount={getTagCount(me, tag)} theirCount={getTagCount(them, tag)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
