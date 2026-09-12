import React, { useMemo } from 'react';
import { Clock, Sparkles } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SolvingPatternsCard({ problems = [], lcCalendar = {} }) {
  const safe = Array.isArray(problems) ? problems : [];

  const { matrix, totalCount, peakSummary, maxVal } = useMemo(() => {
    // Initialize 7x24 matrix (7 days, 24 hours)
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    let total = 0;

    // Process MongoDB problems
    safe.forEach(p => {
      if (p.archived) return;
      const dateVal = p.solvedAt || p.syncedAt || p.createdAt;
      if (!dateVal) return;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return;

      const jsDay = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // 0 = Mon, ..., 6 = Sun
      const hourIdx = d.getHours(); // 0 - 23 in local timezone

      grid[dayIdx][hourIdx] += 1;
      total += 1;
    });

    // Incorporate historical LeetCode calendar timestamps if problems list is small
    if (total < 15 && lcCalendar && typeof lcCalendar === 'object') {
      Object.entries(lcCalendar).forEach(([ts, count]) => {
        const numTs = Number(ts);
        const numCount = Number(count);
        if (!isNaN(numTs) && numTs > 0 && numCount > 0) {
          const d = new Date(numTs * 1000);
          if (!isNaN(d.getTime())) {
            const jsDay = d.getDay();
            const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
            const hourIdx = d.getHours();

            grid[dayIdx][hourIdx] += numCount;
            total += numCount;
          }
        }
      });
    }

    if (total < 15) {
      return { matrix: grid, totalCount: total, peakSummary: '', maxVal: 0 };
    }

    // Find max value in matrix for scaling
    let max = 0;
    const dayTotals = Array(7).fill(0);
    const hourTotals = Array(24).fill(0);

    // Windows: Morning (6-11), Afternoon (12-17), Evening (18-21), Night (22-5)
    let morningCount = 0, afternoonCount = 0, eveningCount = 0, nightCount = 0;

    grid.forEach((row, dIdx) => {
      row.forEach((cnt, hIdx) => {
        if (cnt > max) max = cnt;
        dayTotals[dIdx] += cnt;
        hourTotals[hIdx] += cnt;

        if (hIdx >= 6 && hIdx <= 11) morningCount += cnt;
        else if (hIdx >= 12 && hIdx <= 17) afternoonCount += cnt;
        else if (hIdx >= 18 && hIdx <= 21) eveningCount += cnt;
        else nightCount += cnt;
      });
    });

    // Determine Peak Day
    let peakDayIdx = 0;
    dayTotals.forEach((cnt, i) => {
      if (cnt > dayTotals[peakDayIdx]) peakDayIdx = i;
    });

    // Determine Peak Window
    const windowCounts = [
      { name: 'mornings (6 AM – 12 PM)', count: morningCount },
      { name: 'afternoons (12 PM – 6 PM)', count: afternoonCount },
      { name: 'evenings (6 PM – 10 PM)', count: eveningCount },
      { name: 'late nights (10 PM – 6 AM)', count: nightCount },
    ];
    windowCounts.sort((a, b) => b.count - a.count);
    const peakWindow = windowCounts[0];

    // Check weekday vs weekend concentration
    const weekdayTotal = dayTotals.slice(0, 5).reduce((a, b) => a + b, 0);
    const weekendTotal = dayTotals.slice(5).reduce((a, b) => a + b, 0);

    let summary = '';
    const isFlat = max <= 2 || (peakWindow.count / total) < 0.28;

    if (isFlat) {
      summary = 'Your solving activity is evenly distributed across days and times without a dominant peak.';
    } else {
      const peakDayName = DAYS[peakDayIdx];
      const dayIsDominant = (dayTotals[peakDayIdx] / total) > 0.25;

      if (dayIsDominant) {
        summary = `You solve most often on ${peakDayName} ${peakWindow.name}.`;
      } else if (weekdayTotal > weekendTotal * 1.5) {
        summary = `Your most active solving window is weekday ${peakWindow.name}.`;
      } else if (weekendTotal > weekdayTotal * 1.2) {
        summary = `Your most active solving window is weekend ${peakWindow.name}.`;
      } else {
        summary = `Your peak solving time is during ${peakWindow.name}.`;
      }
    }

    return { matrix: grid, totalCount: total, peakSummary: summary, maxVal: max };
  }, [safe, lcCalendar]);

  if (totalCount < 15) {
    return (
      <div className="glass" style={{ borderRadius: 8, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Clock size={16} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Solving Patterns (Time & Day)</h2>
        </div>
        <div style={{
          padding: '24px 16px', borderRadius: 6, background: 'var(--bg-surface)',
          border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)'
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Not enough data yet to find a pattern
          </p>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            Minimum 15 solved problems required (currently at {totalCount} verified solve{totalCount === 1 ? '' : 's'}).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass" style={{ borderRadius: 8, padding: '20px 22px' }}>
      {/* Top Header & Summary Sentence */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Solving Patterns (Time & Day)</h2>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'rgba(240, 136, 62, 0.12)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
              Local Timezone
            </span>
          </div>
          {peakSummary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
              <Sparkles size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>{peakSummary}</span>
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {totalCount} sample points
        </span>
      </div>

      {/* Heatmap Grid (Hour x Day) */}
      <div className="heatmap-scroll" style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ minWidth: 680 }}>
          {/* Hour Labels Header */}
          <div style={{ display: 'flex', marginLeft: 36, marginBottom: 6 }}>
            {HOURS.map(h => (
              <div
                key={h}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  color: h % 3 === 0 ? 'var(--text-secondary)' : 'transparent'
                }}
              >
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Days Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {DAYS.map((dayName, dIdx) => (
              <div key={dayName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Day Label */}
                <div style={{
                  width: 28, fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)', textAlign: 'right', fontWeight: 600
                }}>
                  {dayName}
                </div>

                {/* 24 Hour Cells for this Day */}
                <div style={{ flex: 1, display: 'flex', gap: 3 }}>
                  {HOURS.map(hIdx => {
                    const count = matrix[dIdx][hIdx];
                    let level = 0;
                    if (count > 0) {
                      if (maxVal <= 2) level = Math.min(count, 4);
                      else {
                        const ratio = count / maxVal;
                        if (ratio <= 0.25) level = 1;
                        else if (ratio <= 0.5) level = 2;
                        else if (ratio <= 0.75) level = 3;
                        else level = 4;
                      }
                    }
                    const timeLabel = `${String(hIdx).padStart(2, '0')}:00 – ${String((hIdx + 1) % 24).padStart(2, '0')}:00`;

                    return (
                      <div
                        key={hIdx}
                        className={`heatmap-cell heatmap-${level}`}
                        style={{ flex: 1, height: 14 }}
                        title={`${count} problem${count === 1 ? '' : 's'} solved on ${dayName} (${timeLabel})`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        <span>Less active</span>
        <div className="heatmap-cell heatmap-0" style={{ width: 10, height: 10 }} />
        <div className="heatmap-cell heatmap-1" style={{ width: 10, height: 10 }} />
        <div className="heatmap-cell heatmap-2" style={{ width: 10, height: 10 }} />
        <div className="heatmap-cell heatmap-3" style={{ width: 10, height: 10 }} />
        <div className="heatmap-cell heatmap-4" style={{ width: 10, height: 10 }} />
        <span>Peak activity</span>
      </div>
    </div>
  );
}
