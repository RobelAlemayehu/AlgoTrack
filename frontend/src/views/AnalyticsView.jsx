import React, { useMemo } from 'react';
import WeaknessPracticePlan from '../components/WeaknessPracticePlan';

function StatMini({ label, value, sub, color }) {
  return (
    <div className="glass" style={{ borderRadius: 6, padding: '14px 16px' }}>
      <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      <p className="stat-value" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p style={{ fontSize: 11, color: color || 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{sub}</p>
    </div>
  );
}

function getLocalDateKey(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

    // Weekly activity — calculated from verified solved problems
    const weekly = [];
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7 - start.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 7);

      const count = safe.filter(p => {
        if (p.archived) return false;
        const dateVal = p.solvedAt || p.syncedAt || p.createdAt;
        if (!dateVal) return false;
        const d = new Date(dateVal);
        return d >= start && d < end;
      }).length;

      weekly.push({
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count
      });
    }

    const maxWeekly = Math.max(...weekly.map(w => w.count), 1);

    return { easy, medium, hard, lc, cf, weekly, maxWeekly, total: lc + cf };
  }, [safe, lcStats, calMap]);

  // Heatmap — 13-Month block layout with single source of truth (Problem collection)
  const heatmapData = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const countMap = {};

    // Single source of truth: verified problem records
    safe.forEach(p => {
      if (p.archived) return;
      const dateKey = getLocalDateKey(p.solvedAt || p.syncedAt || p.createdAt);
      if (dateKey) {
        countMap[dateKey] = (countMap[dateKey] || 0) + 1;
      }
    });

    // Fallback: incorporate historical LeetCode submission dates if no MongoDB problem exists for that day
    Object.entries(calMap).forEach(([ts, cnt]) => {
      const numTs = Number(ts);
      if (!isNaN(numTs) && numTs > 0 && cnt > 0) {
        const dateKey = getLocalDateKey(numTs * 1000);
        if (dateKey && !countMap[dateKey]) {
          countMap[dateKey] = cnt;
        }
      }
    });

    const curYear = today.getFullYear();
    const curMonthIndex = today.getMonth();

    const months = [];
    for (let i = 12; i >= 0; i--) {
      const targetDate = new Date(curYear, curMonthIndex - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const monthName = targetDate.toLocaleString('en-US', { month: 'short' });

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const startSun = new Date(firstDay);
      while (startSun.getDay() !== 0) {
        startSun.setDate(startSun.getDate() - 1);
      }

      const endSat = new Date(lastDay);
      while (endSat.getDay() !== 6) {
        endSat.setDate(endSat.getDate() + 1);
      }

      const weeks = [];
      let dIter = new Date(startSun);

      while (dIter <= endSat) {
        const week = [];
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
          const isCurrentMonth = dIter.getMonth() === month;
          const isFuture = dIter > today;
          const key = getLocalDateKey(dIter);
          const count = (isCurrentMonth && !isFuture) ? (countMap[key] || 0) : 0;

          week.push({
            date: key,
            count,
            isValid: isCurrentMonth && !isFuture,
            level: count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4
          });

          dIter.setDate(dIter.getDate() + 1);
        }
        weeks.push(week);
      }

      months.push({
        year,
        month,
        name: monthName,
        weeks
      });
    }

    // Past 365 days window stats (sums both Codeforces and LeetCode)
    const startOf365 = new Date(today); startOf365.setDate(startOf365.getDate() - 364);
    let totalSubmissions = 0;
    let activeDays = 0;
    let maxStreak = 0;
    let curStreakTemp = 0;

    let temp = new Date(startOf365);
    while (temp <= today) {
      const key = getLocalDateKey(temp);
      const cnt = countMap[key] || 0;
      totalSubmissions += cnt;
      if (cnt > 0) {
        activeDays++;
        curStreakTemp++;
        if (curStreakTemp > maxStreak) maxStreak = curStreakTemp;
      } else {
        curStreakTemp = 0;
      }
      temp.setDate(temp.getDate() + 1);
    }

    // Current streak
    const todayKey = getLocalDateKey(today);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterday);

    let currentStreak = 0;
    let checkDate = new Date(today);
    if (!countMap[todayKey] && !countMap[yesterdayKey]) {
      currentStreak = 0;
    } else {
      if (!countMap[todayKey]) checkDate = yesterday;
      while (true) {
        const k = getLocalDateKey(checkDate);
        if (countMap[k] > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      months,
      totalSubmissions,
      activeDays,
      maxStreak,
      currentStreak
    };
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

      {/* 365-Day Activity Heatmap (Exact LeetCode Layout with Month Gaps) */}
      <div className="glass" style={{ borderRadius: 8, padding: '20px 22px' }}>
        {/* Top Header Rail */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {heatmapData.totalSubmissions} submissions in the past one year
            </span>
            <span title="Combined LeetCode & Codeforces submission count" style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>ⓘ</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <div>
              Total active days: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{heatmapData.activeDays}</span>
            </div>
            <div>
              Max streak: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{heatmapData.maxStreak}</span>
            </div>
            <div style={{
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span>Current streak: {heatmapData.currentStreak}d</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Row */}
        <div className="heatmap-scroll" style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ minWidth: 800 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {/* Weekday Labels Column on the Left */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 28, paddingTop: 1 }}>
                {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, di) => (
                  <div
                    key={di}
                    style={{
                      height: 11,
                      lineHeight: '11px',
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      textAlign: 'right',
                      paddingRight: 6
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Blocks Container with Gap Between Months */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {heatmapData.months.map((m, mi) => (
                  <div key={mi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    {/* Week Columns inside Month Block */}
                    <div style={{ display: 'flex', gap: 3 }}>
                      {m.weeks.map((week, wi) => (
                        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {week.map((cell, di) => (
                            <div
                              key={di}
                              className={`heatmap-cell ${cell.isValid ? `heatmap-${cell.level}` : ''}`}
                              style={{
                                visibility: cell.isValid ? 'visible' : 'hidden'
                              }}
                              title={cell.isValid ? `${cell.count} problem${cell.count === 1 ? '' : 's'} solved on ${cell.date}` : ''}
                            />
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Month Name Below Month Block */}
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {m.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span>Less</span>
          <div className="heatmap-cell heatmap-0" />
          <div className="heatmap-cell heatmap-1" />
          <div className="heatmap-cell heatmap-2" />
          <div className="heatmap-cell heatmap-3" />
          <div className="heatmap-cell heatmap-4" />
          <span>More</span>
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

      {/* Weakness-Based Practice Plan */}
      <WeaknessPracticePlan problems={problems} />
    </div>
  );
}


