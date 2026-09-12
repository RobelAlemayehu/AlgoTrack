import React, { useState, useEffect } from 'react';
import { Target, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';

const API = import.meta.env.VITE_API || 'http://localhost:5000';

function getRatingClass(d) {
  if (!d) return 'rating-gray';
  const num = parseInt(d);
  if (!isNaN(num)) {
    if (num < 1200) return 'rating-green';
    if (num < 1400) return 'rating-green';
    if (num < 1600) return 'rating-cyan';
    if (num < 1900) return 'rating-blue';
    if (num < 2100) return 'rating-violet';
    if (num < 2400) return 'rating-orange';
    return 'rating-red';
  }
  const lower = String(d).toLowerCase();
  if (lower === 'easy') return 'badge-easy';
  if (lower === 'medium') return 'badge-medium';
  if (lower === 'hard') return 'badge-hard';
  return 'badge-unknown';
}

export default function SimilarProblemsSection({ problem, token }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!problem || !token) return;

    const fetchSimilar = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/recommend/similar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: problem.title,
            platform: problem.platform,
            problemId: problem.problemId,
            difficulty: problem.difficulty,
            tags: problem.tags || []
          })
        });

        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.similar || []);
        }
      } catch (err) {
        console.error('Fetch similar problems error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [problem?._id, token]);

  if (!problem) return null;

  return (
    <div className="glass" style={{ borderRadius: 8, padding: '16px 18px', marginTop: 20, borderLeft: '4px solid var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Similar Practice Problems</h3>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'rgba(240, 136, 62, 0.12)', padding: '2px 6px', borderRadius: 4 }}>
            Pattern Reinforcement
          </span>
        </div>
        {loading && <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Finding similar unsolved problems by topic & rating…</p>
      ) : suggestions.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No similar unsolved problems found for this pattern right now.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {suggestions.map((item, idx) => (
            <div key={item.id || idx} style={{
              background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 6,
              border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={`badge ${item.platform === 'LeetCode' ? 'badge-lc' : 'badge-cf'}`} style={{ fontSize: 9 }}>{item.platform}</span>
                  <span className={getRatingClass(item.difficulty)} style={{ fontSize: 11 }}>{item.difficulty}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={11} style={{ color: 'var(--accent)' }} />
                  <span>{item.reason}</span>
                </div>
              </div>

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
                style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}
              >
                Practice <ExternalLink size={12} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
