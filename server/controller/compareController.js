const axios = require('axios');
const Problem = require('../models/Problem');
const User = require('../models/User');

const LC_GQL = 'https://leetcode.com/graphql';
const LC_HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://leetcode.com',
  'Origin': 'https://leetcode.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

/**
 * GET /api/compare?cf=handle2&lc=handle2
 * Returns a side-by-side comparison of the current user vs a target user.
 */
const compareUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const cf2Handle = req.query.cf || '';
    const lc2Handle = req.query.lc || '';

    if (!cf2Handle && !lc2Handle) {
      return res.status(400).json({ msg: 'Provide at least one handle (cf or lc) to compare with.' });
    }

    // ── Current user's data from DB ───────────────────────────────────────────
    const myProblems = await Problem.find({ userId: req.user.id });
    const myStats = buildLocalStats(myProblems, currentUser);

    // ── Target user's data from APIs (live fetch) ──────────────────────────────
    const [cfData, lcData] = await Promise.allSettled([
      cf2Handle ? fetchCFStats(cf2Handle) : Promise.resolve(null),
      lc2Handle ? fetchLCStats(lc2Handle)  : Promise.resolve(null),
    ]);

    const targetCF = cfData.status === 'fulfilled' ? cfData.value : null;
    const targetLC = lcData.status === 'fulfilled' ? lcData.value : null;

    const targetStats = buildTargetStats(targetCF, targetLC, cf2Handle, lc2Handle);

    // ── Common solved problems (CF only since LC only has recent 20) ──────────
    const myProblemIds = new Set(myProblems.filter(p => p.platform === 'Codeforces').map(p => p.problemId));
    const commonProblems = (targetCF?.solvedIds || []).filter(id => myProblemIds.has(id));

    res.json({
      me: myStats,
      them: targetStats,
      commonCount: commonProblems.length,
      comparedHandles: { cf: cf2Handle, lc: lc2Handle }
    });

  } catch (err) {
    console.error('Compare error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLocalStats(problems, user) {
  const lcS = user.lcStats || {};
  const activeProblems = problems.filter(p => !p.archived);
  const cfCount = activeProblems.filter(p => p.platform === 'Codeforces').length;
  const lcCount = lcS.total || activeProblems.filter(p => p.platform === 'LeetCode').length;

  const tags = {};
  activeProblems.forEach(p => (p.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));

  return {
    username: user.username,
    handles: user.handles || {},
    cfRating: (user.handles?.codeforces && user.cfRating) ? user.cfRating : null,
    cfMaxRating: (user.handles?.codeforces && user.cfMaxRating) ? user.cfMaxRating : null,
    cfRank: user.handles?.codeforces ? (user.cfRank || 'Unrated') : 'Not provided',
    lcRanking: lcS.ranking || 0,
    totalSolved: cfCount + lcCount,
    cfSolved: cfCount,
    cfTotal: cfCount,
    lcSolved: lcCount,
    lcTotal: lcCount,
    easy:   lcS.easy   || activeProblems.filter(p => p.difficulty?.toLowerCase() === 'easy').length,
    medium: lcS.medium || activeProblems.filter(p => p.difficulty?.toLowerCase() === 'medium').length,
    hard:   lcS.hard   || activeProblems.filter(p => p.difficulty?.toLowerCase() === 'hard').length,
    topTags: Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, c]) => ({ tag: t, count: c }))
  };
}

function buildTargetStats(cfData, lcData, cfHandle, lcHandle) {
  const cfCount = cfData?.solvedCount || 0;
  const lcTotal = lcData?.total || 0;
  const tags = {};
  (cfData?.tagCounts || []).forEach(({ tag, count }) => { tags[tag] = (tags[tag] || 0) + count; });
  (lcData?.tagCounts || []).forEach(({ tag, count }) => { tags[tag] = (tags[tag] || 0) + count; });

  const usernameDisplay = cfHandle && lcHandle ? `${lcHandle} / ${cfHandle}` : (lcHandle || cfHandle || 'Opponent');

  return {
    username: usernameDisplay,
    handle: usernameDisplay,
    handles: { codeforces: cfHandle, leetcode: lcHandle },
    cfRating: cfHandle ? (cfData?.rating ?? null) : null,
    cfMaxRating: cfHandle ? (cfData?.maxRating ?? null) : null,
    cfRank: cfHandle ? (cfData?.rank || 'Unrated') : 'Not provided',
    lcRanking: lcData?.ranking || 0,
    totalSolved: cfCount + lcTotal,
    cfSolved: cfCount,
    cfTotal: cfCount,
    lcSolved: lcTotal,
    lcTotal: lcTotal,
    easy:   lcData?.easy   || 0,
    medium: lcData?.medium || 0,
    hard:   lcData?.hard   || 0,
    topTags: Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, c]) => ({ tag: t, count: c }))
  };
}

async function fetchCFStats(handle) {
  const [infoRes, statusRes] = await Promise.all([
    axios.get(`https://codeforces.com/api/user.info?handles=${handle}`, { timeout: 10000 }),
    axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100000`, { timeout: 20000 })
  ]);

  const info = infoRes.data.status === 'OK' ? infoRes.data.result[0] : {};
  const subs = statusRes.data.status === 'OK' ? statusRes.data.result : [];

  const uniqueSolved = new Map();
  const tagCounts = {};
  subs.forEach(sub => {
    if (sub.verdict !== 'OK') return;
    const id = `CF-${sub.problem.contestId}${sub.problem.index}`;
    if (!uniqueSolved.has(id)) {
      uniqueSolved.set(id, true);
      (sub.problem.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    }
  });

  return {
    rating: info.rating || 0,
    maxRating: info.maxRating || 0,
    rank: info.rank || '',
    solvedCount: uniqueSolved.size,
    solvedIds: [...uniqueSolved.keys()],
    tagCounts: Object.entries(tagCounts).map(([tag, count]) => ({ tag, count }))
  };
}

async function fetchLCStats(username) {
  const query = {
    query: `
      query lcCompare($username: String!) {
        matchedUser(username: $username) {
          profile { ranking }
          submitStatsGlobal {
            acSubmissionNum { difficulty count }
          }
          tagProblemCounts {
            advanced { tagName problemsSolved }
            intermediate { tagName problemsSolved }
            fundamental { tagName problemsSolved }
          }
        }
      }`,
    variables: { username }
  };
  const res = await axios.post(LC_GQL, query, { headers: LC_HEADERS, timeout: 10000 });
  const mu = res.data?.data?.matchedUser;
  if (!mu) return null;

  const nums = mu.submitStatsGlobal?.acSubmissionNum || [];
  const tagCounts = {};
  const tpc = mu.tagProblemCounts || {};
  ['advanced', 'intermediate', 'fundamental'].forEach(tier => {
    (tpc[tier] || []).forEach(item => {
      if (item.tagName && item.problemsSolved > 0) {
        tagCounts[item.tagName] = item.problemsSolved;
      }
    });
  });

  return {
    ranking: mu.profile?.ranking || 0,
    easy:   nums.find(x => x.difficulty === 'Easy')?.count   || 0,
    medium: nums.find(x => x.difficulty === 'Medium')?.count || 0,
    hard:   nums.find(x => x.difficulty === 'Hard')?.count   || 0,
    total:  nums.find(x => x.difficulty === 'All')?.count    || 0,
    tagCounts: Object.entries(tagCounts).map(([tag, count]) => ({ tag, count }))
  };
}

module.exports = { compareUsers };
