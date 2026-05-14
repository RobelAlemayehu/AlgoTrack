import React, { useMemo } from 'react';

function StatMini({ label, value, sub, color }) {
  return (
    <div className="glass" style={{ borderRadius: 12, padding: '16px 18px' }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ fontSize: 11, color: color || 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>{sub}</p>
    </div>
  );
}

export default function AnalyticsView({ problems, lcStats, lcCalendar }) {
  const safe   = Array.isArray(problems) ? problems : [];
  const calMap = (lcCalendar && typeof lcCalendar === 'object') ? lcCalendar : {};

  const stats = useMemo(() => {
    // Use real LC API stats when available; fall back to DB count
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

    // Streak — from CF DB data
    const daySet = new Set(safe.map(p => {
      const d = new Date(p.syncedAt || p.createdAt || 0);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));
    const sortedDays = [...daySet].sort((a, b) => b - a);
    let streak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < sortedDays.length; i++) {
      const exp = new Date(today); exp.setDate(exp.getDate() - i);
      if (sortedDays[i] === exp.getTime()) streak++;
      else break;
    }

    return { easy, medium, hard, lc, cf, weekly, maxWeekly, streak, total: lc + cf };
  }, [safe, lcStats, calMap]);

  // Heatmap — merge real LC calendar (timestamp→count) with CF DB solve dates
  const heatmap = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(today.getDate() - 364);
    while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

    // CF problems from DB
    const countMap = {};
    safe.forEach(p => {
      const d = new Date(p.syncedAt || p.createdAt || 0);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split('T')[0];
      countMap[key] = (countMap[key] || 0) + 1;
    });

    // LC calendar (unix seconds → count)
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
      if (cur > today) break;
    }
    return weeks;
  }, [safe, calMap]);

  // Total contributions = DB count + unique LC calendar days with activity
  const lcCalDays = Object.keys(calMap).length;

  return (
    <div className="animate-fade-in" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Analytics</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Your performance insights — LeetCode calendar + Codeforces data combined
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatMini label="Total Solved"   value={stats.total}               sub="Lifetime"           color="var(--emerald)" />
        <StatMini label="Current Streak" value={`${stats.streak}d`}        sub="Keep it up!"    color="var(--orange)" />
        <StatMini label="Hard Problems"  value={stats.hard}                sub={`${stats.total ? Math.round((stats.hard / stats.total) * 100) : 0}% of total`} color="var(--red)" />
        <StatMini label="LC Active Days" value={lcCalDays || stats.weekly[9]?.count || 0} sub={lcCalDays ? 'from LC calendar' : 'this week'} color="var(--indigo-light)" />
      </div>

      {/* Heatmap */}
      <div className="glass" style={{ borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Activity Heatmap</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              {lcCalDays > 0 ? `Real LeetCode calendar merged with ${safe.filter(p=>p.platform==='Codeforces').length} Codeforces solves` : `${safe.length} contributions — sync LeetCode for real calendar data`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Less</span>
            {[0,1,2,3,4].map(l => <div key={l} className={`heatmap-cell heatmap-${l}`} style={{ flexShrink: 0 }} />)}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>More</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
            {heatmap.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {week.map(day => (
                  <div key={day.date} className={`heatmap-cell heatmap-${day.level}`} title={`${day.count} on ${day.date}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Weekly bar chart */}
        <div className="glass" style={{ borderRadius: 14, padding: '20px 22px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Weekly Activity</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>Last 10 weeks (CF + LC combined)</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
            {stats.weekly.map((w, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} className="tooltip-wrapper">
                <div className="tooltip">{w.count} problems · {w.label}</div>
                <div style={{
                  width: '100%', borderRadius: '5px 5px 0 0', minHeight: 4,
                  background: i === 9 ? 'linear-gradient(180deg, var(--indigo-light), var(--indigo))' : 'rgba(99,102,241,0.2)',
                  height: `${Math.max((w.count / stats.maxWeekly) * 100, 4)}%`,
                  transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)'
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown */}
        <div className="glass" style={{ borderRadius: 14, padding: '20px 22px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Problem Breakdown</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Easy',       count: stats.easy,   color: 'var(--emerald)' },
              { label: 'Medium',     count: stats.medium, color: 'var(--yellow)'  },
              { label: 'Hard',       count: stats.hard,   color: 'var(--red)'     },
              { label: 'LeetCode',   count: stats.lc,     color: 'var(--orange)'  },
              { label: 'Codeforces', count: stats.cf,     color: 'var(--blue)'    },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 72, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div className="progress-fill" style={{ width: stats.total ? `${(item.count / stats.total) * 100}%` : '0%', background: item.color }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.color, minWidth: 24, textAlign: 'right' }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
