import React, { useMemo } from 'react';
import { Target, AlertTriangle, ChevronRight, Zap } from 'lucide-react';

const COMMON_TAGS = ['Arrays', 'Strings', 'DP', 'Graphs', 'Trees', 'Math', 'Greedy', 'Two Pointers'];

export default function WeaknessPracticePlan({ problems = [] }) {
  const { tagCounts, weakTags, recommendations } = useMemo(() => {
    const counts = {};
    COMMON_TAGS.forEach(t => counts[t] = 0);

    const safe = Array.isArray(problems) ? problems : [];
    safe.forEach(p => {
      (p.tags || []).forEach(t => {
        const lower = t.toLowerCase();
        if (lower.includes('dp') || lower.includes('dynamic')) counts['DP']++;
        else if (lower.includes('graph')) counts['Graphs']++;
        else if (lower.includes('tree')) counts['Trees']++;
        else if (lower.includes('array')) counts['Arrays']++;
        else if (lower.includes('string')) counts['Strings']++;
        else if (lower.includes('math')) counts['Math']++;
        else if (lower.includes('greedy')) counts['Greedy']++;
        else if (lower.includes('pointer')) counts['Two Pointers']++;
      });
    });

    const sortedTags = Object.entries(counts).sort((a, b) => a[1] - b[1]);
    const weak = sortedTags.slice(0, 3).map(([tag]) => tag);

    // Surface up to 5 problems matching weak tags
    const recs = safe.filter(p => (p.tags || []).some(t => {
      const lower = t.toLowerCase();
      return weak.some(w => lower.includes(w.toLowerCase()));
    })).slice(0, 5);

    return { tagCounts: counts, weakTags: weak, recommendations: recs };
  }, [problems]);

  // Compute SVG Radar Chart points
  const radarPoints = useMemo(() => {
    const center = 100;
    const radius = 70;
    const total = COMMON_TAGS.length;
    const maxVal = Math.max(...Object.values(tagCounts), 5);

    const points = COMMON_TAGS.map((tag, i) => {
      const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
      const val = tagCounts[tag] || 0;
      const r = (val / maxVal) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return { x, y, tag, val, angle };
    });

    const polygonStr = points.map(p => `${p.x},${p.y}`).join(' ');
    return { points, polygonStr, center, radius, total };
  }, [tagCounts]);

  return (
    <div className="glass" style={{ borderRadius: 8, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={16} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Weakness-Based Practice Plan</h2>
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Tag Coverage Analysis</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'center' }}>
        {/* SVG Radar Spider Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Grid Rings */}
            {[0.25, 0.5, 0.75, 1.0].map((scale, idx) => (
              <polygon
                key={idx}
                points={COMMON_TAGS.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / COMMON_TAGS.length - Math.PI / 2;
                  const r = 70 * scale;
                  return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                }).join(' ')}
                fill="none"
                stroke="var(--border)"
                strokeDasharray={scale === 1 ? 'none' : '2,2'}
                strokeWidth="1"
              />
            ))}

            {/* Axis Lines */}
            {COMMON_TAGS.map((_, i) => {
              const angle = (Math.PI * 2 * i) / COMMON_TAGS.length - Math.PI / 2;
              return (
                <line
                  key={i}
                  x1="100" y1="100"
                  x2={100 + 70 * Math.cos(angle)}
                  y2={100 + 70 * Math.sin(angle)}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Data Area */}
            <polygon
              points={radarPoints.polygonStr}
              fill="rgba(240, 136, 62, 0.25)"
              stroke="var(--accent)"
              strokeWidth="2"
            />

            {/* Data Points */}
            {radarPoints.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
            ))}
          </svg>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>Skill Radar Chart</span>
        </div>

        {/* Actionable Rationale & Recommended Practice Set */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(240,136,62,0.3)', borderRadius: 6, padding: '10px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={13} /> Identified Weak Tags: {weakTags.join(', ')}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
              You've solved fewer <strong>{weakTags[0]}</strong> and <strong>{weakTags[1]}</strong> problems relative to your overall progress. Practice these 5 targeted problems to close the skill gap:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recommendations.slice(0, 4).map((p, i) => (
              <div key={p._id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', flexShrink: 0, marginLeft: 8 }}>
                  {(p.tags || [])[0] || weakTags[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
