const axios = require('axios');

// In-memory cache for CF contests (5 min TTL)
let contestCache = { data: [], fetchedAt: 0 };

exports.getUpcomingContests = async (req, res) => {
  try {
    const FIVE_MIN = 5 * 60 * 1000;
    if (contestCache.data.length > 0 && Date.now() - contestCache.fetchedAt < FIVE_MIN) {
      return res.json(contestCache.data);
    }

    const response = await axios.get('https://codeforces.com/api/contest.list?gym=false', { timeout: 10000 });

    if (response.data?.status === 'OK') {
      const allContests = response.data.result || [];
      const upcoming = allContests
        .filter(c => c.phase === 'BEFORE')
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
        .slice(0, 6)
        .map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          startTimeSeconds: c.startTimeSeconds,
          durationSeconds: c.durationSeconds,
          relativeTimeSeconds: c.relativeTimeSeconds
        }));

      contestCache = { data: upcoming, fetchedAt: Date.now() };
      return res.json(upcoming);
    }

    res.json(contestCache.data);
  } catch (err) {
    console.log('[Contests] Error fetching Codeforces contests:', err.message);
    res.json(contestCache.data || []);
  }
};
