/**
 * Backend Streak Calculator for AlgoTrack
 *
 * Solves:
 * 1. Timezone handling: uses UTC calendar days (YYYY-MM-DD) or optional client timezone offset.
 * 2. LeetCode calendar format: safely parses Unix second timestamps (Number(ts) * 1000).
 * 3. Date field: prioritizes actual platform solve dates (solvedAt), fallback syncedAt/createdAt.
 * 4. Deduplication & Sorting: merges Problem solve dates and LeetCode calendar into distinct sorted UTC days.
 * 5. Consecutive-day walk: safe UTC date decrementing (setUTCDate) without timezone flicker or off-by-one errors.
 */

function getDayStr(dateInput, tzOffsetMinutes = 0) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  // If tzOffsetMinutes is provided (from client Date.prototype.getTimezoneOffset()),
  // adjust ms accordingly. Otherwise default to pure UTC calendar date.
  const ms = d.getTime() - (tzOffsetMinutes * 60 * 1000);
  const adjusted = new Date(ms);

  const y = adjusted.getUTCFullYear();
  const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjusted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calculateStreak(problems = [], lcCalendar = {}, tzOffsetMinutes = 0) {
  const daySet = new Set();

  // 1. Add Problem solve dates (excluding archived)
  (problems || []).forEach(p => {
    if (p.archived) return;
    const solveDate = p.solvedAt || p.syncedAt || p.createdAt;
    const dayStr = getDayStr(solveDate, tzOffsetMinutes);
    if (dayStr) daySet.add(dayStr);
  });

  // 2. Add LeetCode activity calendar timestamps
  Object.keys(lcCalendar || {}).forEach(ts => {
    const count = lcCalendar[ts];
    if (count > 0) {
      const num = Number(ts);
      if (!isNaN(num) && num > 0) {
        // LeetCode calendar keys are Unix seconds
        const dayStr = getDayStr(num * 1000, tzOffsetMinutes);
        if (dayStr) daySet.add(dayStr);
      }
    }
  });

  if (daySet.size === 0) return 0;

  const now = new Date();
  const todayStr = getDayStr(now, tzOffsetMinutes);

  // Yesterday date
  const yesterdayDate = new Date(now.getTime() - 86400000);
  const yesterdayStr = getDayStr(yesterdayDate, tzOffsetMinutes);

  // If user hasn't solved anything today AND hasn't solved anything yesterday, streak is 0
  if (!daySet.has(todayStr) && !daySet.has(yesterdayStr)) {
    return 0;
  }

  // Determine starting point for walk
  const startStr = daySet.has(todayStr) ? todayStr : yesterdayStr;

  // Walk backward day by day in UTC
  let streak = 0;
  const parts = startStr.split('-').map(Number);
  const curr = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

  while (true) {
    const y = curr.getUTCFullYear();
    const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const day = String(curr.getUTCDate()).padStart(2, '0');
    const checkStr = `${y}-${m}-${day}`;

    if (daySet.has(checkStr)) {
      streak++;
      curr.setUTCDate(curr.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

module.exports = { calculateStreak, getDayStr };
