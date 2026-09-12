import React, { useMemo } from 'react';

function StatMini({ label, value, sub, color }) {
  return (
    <div className="glass" style={{ borderRadius: 6, padding: '14px 16px' }}>
      <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      <p className="stat-value" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p style={{ fontSize: 11, color: color || 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{sub}</p>
    </div>
  );
}

export default function AnalyticsView({ problems, lcStats, lcCalendar }) {
  const safe   = Array.isArray(problems) ? problems : [];
  const calMap = (lcCalendar && typeof lcCalendar === 'object') ? lcCalendar : {};

  const stats = useMemo(() => {
    const easy   = lcStats?.easy   ?? safe.filter(p => p.difficulty?.toLowerCase() === 'easy').length;
    const medium = lcStats?.medium ?? safe.filter(p => p.difficulty?.toLowerCase() === 'medium').length;
    const hard   = lcStats?.hard   ?? safe.filter(p => p.difficulty?.toLowerCase() === 'hard').length;
    const lc     = lcStats?.total  ?? safe.filter(p => p.platform === 'LeetCode').length;
    const cf     = safe.filter(p => p.platform === 'Codeforces').length;

    // Weekly activity — merge CF DB dates + LC calendar
    const weekly = [];
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7 - start.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 7);

      const cfCount = safe.filter(p => {
        const d = new Date(p.syncedAt || p.createdAt || 0);
        return d >= start && d < end;
      }).length;

      const lcCount = Object.entries(calMap).reduce((acc, [ts, cnt]) => {
        const d = new Date(parseInt(ts) * 1000);
        return (d >= start && d < end) ? acc + cnt : acc;
      }, 0);

      weekly.push({
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: cfCount + lcCount
      });
    }

    const maxWeekly = Math.max(...weekly.map(w => w.count), 1);

    return { easy, medium, hard, lc, cf, weekly, maxWeekly, total: lc + cf };
  }, [safe, lcStats, calMap]);

  // Heatmap — merge LC calendar (timestamp→count) with CF DB solve dates
  const heatmap = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(today.getDate() - 364);
    while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

    const countMap = {};
    safe.forEach(p => {
      const d = new Date(p.syncedAt || p.createdAt || 0);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split('T')[0];
      countMap[key] = (countMap[key] || 0) + 1;
    });

    Object.entries(calMap).forEach(([ts, cnt]) => {
      const d = new Date(parseInt(ts) * 1000);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split('T')[0];
      countMap[key] = (countMap[key] || 0) + cnt;
    });

    const weeks = [];
    let cur = new Date(start);
    while (cur <= today) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const key = cur.toISOString().split('T')[0];
        const count = countMap[key] || 0;
        week.push({ date: key, count, level: count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4 });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [safe, calMap]);

  return (
    <div className="animate-fade-in view-pad" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Performance & Analytics</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Historical submission activity across LeetCode & Codeforces</p>
      </div>

      {/* Mini stats rail */}
      <div className="grid-stats-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatMini label="TOTAL SOLVED" value={stats.total} sub={`${stats.lc} LC · ${stats.cf} CF`} color="var(--accent)" />
        <StatMini label="EASY" value={stats.easy} sub="Elementary DSA" color="var(--cf-green)" />
        <StatMini label="MEDIUM" value={stats.medium} sub="Intermediate DSA" color="var(--lc-yellow)" />
        <StatMini label="HARD" value={stats.hard} sub="Advanced DSA / CF Rated" color="var(--cf-red)" />
      </div>

      {/* 365-Day Activity Heatmap */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>365-Day Solve Heatmap</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <span>Less</span>
            <div className="heatmap-cell heatmap-0" />
            <div className="heatmap-cell heatmap-1" />
            <div className="heatmap-cell heatmap-2" />
            <div className="heatmap-cell heatmap-3" />
            <div className="heatmap-cell heatmap-4" />
            <span>More</span>
          </div>
        </div>

        <div className="heatmap-scroll" style={{ overflowX: 'auto', paddingBottom: 6 }}>
          <div style={{ display: 'flex', gap: 3, minWidth: 700 }}>
            {heatmap.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className={`heatmap-cell heatmap-${cell.level}`}
                    title={`${cell.date}: ${cell.count} problem${cell.count === 1 ? '' : 's'}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Velocity Bar Chart */}
      <div className="glass" style={{ borderRadius: 6, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Weekly Velocity (Past 10 Weeks)</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          {stats.weekly.map((w, i) => {
            const pct = Math.round((w.count / stats.maxWeekly) * 100);
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: 4 }}>{w.count > 0 ? w.count : ''}</span>
                <div style={{
                  width: '100%', maxWidth: 28, height: `${Math.max(4, pct)}%`,
                  background: 'var(--accent)', borderRadius: '3px 3px 0 0',
                  transition: 'height 0.4s ease'
                }} />
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 8, whiteSpace: 'nowrap' }}>{w.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
