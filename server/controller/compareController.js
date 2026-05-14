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
  const cfCount = problems.filter(p => p.platform === 'Codeforces').length;
  const lcCount = lcS.total || problems.filter(p => p.platform === 'LeetCode').length;

  const tags = {};
  problems.forEach(p => (p.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));

  return {
    username: user.username,
    handles: user.handles || {},
    cfRating: user.cfRating || 0,
    cfMaxRating: user.cfMaxRating || 0,
    cfRank: user.cfRank || '',
    lcRanking: lcS.ranking || 0,
    totalSolved: cfCount + lcCount,
    cfSolved: cfCount,
    lcSolved: lcCount,
    easy:   lcS.easy   || problems.filter(p => p.difficulty?.toLowerCase() === 'easy').length,
    medium: lcS.medium || problems.filter(p => p.difficulty?.toLowerCase() === 'medium').length,
    hard:   lcS.hard   || problems.filter(p => p.difficulty?.toLowerCase() === 'hard').length,
    topTags: Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, c]) => ({ tag: t, count: c }))
  };
}

function buildTargetStats(cfData, lcData, cfHandle, lcHandle) {
  const cfCount = cfData?.solvedCount || 0;
  const lcTotal = lcData?.total || 0;
  const tags = {};
  (cfData?.tagCounts || []).forEach(({ tag, count }) => { tags[tag] = (tags[tag] || 0) + count; });

  return {
    username: cfHandle || lcHandle,
    handles: { codeforces: cfHandle, leetcode: lcHandle },
    cfRating: cfData?.rating || 0,
    cfMaxRating: cfData?.maxRating || 0,
    cfRank: cfData?.rank || '',
    lcRanking: lcData?.ranking || 0,
    totalSolved: cfCount + lcTotal,
    cfSolved: cfCount,
    lcSolved: lcTotal,
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
        }
      }`,
    variables: { username }
  };
  const res = await axios.post(LC_GQL, query, { headers: LC_HEADERS, timeout: 10000 });
  const mu = res.data?.data?.matchedUser;
  if (!mu) return null;

  const nums = mu.submitStatsGlobal?.acSubmissionNum || [];
  return {
    ranking: mu.profile?.ranking || 0,
    easy:   nums.find(x => x.difficulty === 'Easy')?.count   || 0,
    medium: nums.find(x => x.difficulty === 'Medium')?.count || 0,
    hard:   nums.find(x => x.difficulty === 'Hard')?.count   || 0,
    total:  nums.find(x => x.difficulty === 'All')?.count    || 0,
  };
}

module.exports = { compareUsers };
