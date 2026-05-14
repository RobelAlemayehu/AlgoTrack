import React, { useState } from 'react';
import { Users, Search, TrendingUp, Code, Star, ExternalLink, BarChart3, Zap, Award } from 'lucide-react';

function StatBlock({ label, me, them, color, higher = 'me' }) {
  const meNum  = Number(me)  || 0;
  const themNum = Number(them) || 0;
  const meWins  = meNum >= themNum;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: 18, fontWeight: 800, color: meWins ? 'var(--emerald)' : 'var(--text-primary)',
          ...(meWins ? { textShadow: '0 0 10px rgba(16,185,129,0.3)' } : {})
        }}>{me ?? '—'}</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 100 }}>
        {label}
      </div>
      <div>
        <span style={{
          fontSize: 18, fontWeight: 800, color: !meWins && themNum > meNum ? 'var(--orange)' : 'var(--text-primary)'
        }}>{them ?? '—'}</span>
      </div>
    </div>
  );
}

function TagBar({ tag, myCount, theirCount }) {
  const max = Math.max(myCount, theirCount, 1);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'capitalize' }}>{tag}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{myCount} vs {theirCount}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, height: 6 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(myCount / max) * 100}%`, background: 'var(--indigo)', borderRadius: 3 }} />
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(theirCount / max) * 100}%`, background: 'var(--orange)', borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

export default function CompareView({ token, myStats }) {
  const [cfHandle, setCfHandle] = useState('');
  const [lcHandle, setLcHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  const handleCompare = async () => {
    if (!cfHandle && !lcHandle) { setError('Enter at least one handle to compare with.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const params = new URLSearchParams();
      if (cfHandle) params.set('cf', cfHandle);
      if (lcHandle) params.set('lc', lcHandle);
      const res  = await fetch(`http://localhost:5000/api/sync/compare?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || data.msg || 'Compare failed'); return; }
      setResult(data);
    } catch (e) { setError('Network error: ' + e.message); }
    finally { setLoading(false); }
  };

  const me   = result?.me;
  const them = result?.them;

  // Merge tag lists for comparison chart
  const allTags = result ? [...new Set([
    ...(me?.topTags   || []).map(t => t.tag),
    ...(them?.topTags || []).map(t => t.tag)
  ])].slice(0, 6) : [];

  const getTagCount = (stats, tag) => stats?.topTags?.find(t => t.tag === tag)?.count || 0;

  return (
    <div className="animate-fade-in" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={22} color="var(--indigo-light)" /> Compare
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Compare your profile with any competitive programmer</p>
      </div>

      {/* Search row */}
      <div className="glass" style={{ borderRadius: 14, padding: '20px 22px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>Enter the person you want to compare with:</p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Codeforces Handle</label>
            <input className="input-field" placeholder="e.g. tourist" value={cfHandle} onChange={e => setCfHandle(e.target.value.trim())} onKeyDown={e => e.key === 'Enter' && handleCompare()} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>LeetCode Handle</label>
            <input className="input-field" placeholder="e.g. neal_wu" value={lcHandle} onChange={e => setLcHandle(e.target.value.trim())} onKeyDown={e => e.key === 'Enter' && handleCompare()} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-primary" onClick={handleCompare} disabled={loading} style={{ height: 42 }}>
              {loading ? 'Comparing…' : <><Search size={14} /> Compare</>}
            </button>
          </div>
        </div>
        {error && <p style={{ marginTop: 10, fontSize: 12, color: 'var(--red)' }}>{error}</p>}
        {loading && <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Fetching live data from Codeforces & LeetCode… this may take ~10 seconds.</p>}
      </div>

      {result && (
        <>
          {/* Header labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12 }}>
            <div className="glass" style={{ borderRadius: 12, padding: '14px 18px', textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--indigo-light)' }}>{me?.username || 'You'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {me?.handles?.codeforces && `CF: ${me.handles.codeforces}`}
                {me?.handles?.codeforces && me?.handles?.leetcode && ' · '}
                {me?.handles?.leetcode && `LC: ${me.handles.leetcode}`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--indigo-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={14} color="var(--indigo-light)" />
              </div>
            </div>
            <div className="glass" style={{ borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--orange)' }}>{them?.username || 'Opponent'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {them?.handles?.codeforces && `CF: ${them.handles.codeforces}`}
                {them?.handles?.codeforces && them?.handles?.leetcode && ' · '}
                {them?.handles?.leetcode && `LC: ${them.handles.leetcode}`}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {/* Head-to-head stats */}
            <div className="glass" style={{ borderRadius: 14, padding: '20px 22px' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Head-to-Head</h2>
              <StatBlock label="Total Solved"   me={me?.totalSolved}  them={them?.totalSolved} />
              <StatBlock label="CF Solved"      me={me?.cfSolved}     them={them?.cfSolved} />
              <StatBlock label="LC Solved"      me={me?.lcSolved}     them={them?.lcSolved} />
              <StatBlock label="CF Rating"      me={me?.cfRating}     them={them?.cfRating} />
              <StatBlock label="LC Ranking"     me={me?.lcRanking ? `#${me.lcRanking.toLocaleString()}` : '—'} them={them?.lcRanking ? `#${them.lcRanking.toLocaleString()}` : '—'} />
              <StatBlock label="Easy"   me={me?.easy}   them={them?.easy} />
              <StatBlock label="Medium" me={me?.medium} them={them?.medium} />
              <StatBlock label="Hard"   me={me?.hard}   them={them?.hard} />

              {result.commonCount > 0 && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'var(--indigo-dim)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize: 12, color: 'var(--indigo-light)', fontWeight: 600 }}>
                    🤝 You've both solved {result.commonCount} common Codeforces problems!
                  </p>
                </div>
              )}

              {/* CF Rank badges */}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                {[me, them].map((s, i) => s?.cfRank ? (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                    <Award size={12} color={i === 0 ? 'var(--indigo-light)' : 'var(--orange)'} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{s.cfRank}</span>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Tag comparison */}
            <div className="glass" style={{ borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Tag Comparison</h2>
                <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--indigo)', display: 'inline-block' }} /> You</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--orange)', display: 'inline-block' }} /> Them</span>
                </div>
              </div>
              {allTags.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 24 }}>No tag data available (sync Codeforces to see tags)</p>
              ) : (
                allTags.map(tag => (
                  <TagBar key={tag} tag={tag} myCount={getTagCount(me, tag)} theirCount={getTagCount(them, tag)} />
                ))
              )}

              {/* Performance analysis */}
              <div style={{ marginTop: 18, padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>📊 Analysis</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {(me?.totalSolved || 0) > (them?.totalSolved || 0)
                    ? `You're ahead by ${(me?.totalSolved || 0) - (them?.totalSolved || 0)} problems overall. `
                    : (me?.totalSolved || 0) < (them?.totalSolved || 0)
                    ? `You're ${(them?.totalSolved || 0) - (me?.totalSolved || 0)} problems behind. Keep grinding! `
                    : 'You\'re neck and neck! '}
                  {(me?.hard || 0) > (them?.hard || 0)
                    ? 'You solve more hard problems — great for ratings!'
                    : (them?.hard || 0) > (me?.hard || 0)
                    ? 'They solve more hard problems — challenge yourself!'
                    : ''}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
