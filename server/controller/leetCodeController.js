const axios = require('axios');
const Problem = require('../models/Problem');
const User = require('../models/User');

const LC_GQL = 'https://leetcode.com/graphql';
const HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://leetcode.com',
  'Origin': 'https://leetcode.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'x-csrftoken': 'dummy',
};

// Sleep helper to avoid rate limiting
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── 1. Fetch profile stats + calendar + recent submissions in ONE query ──────
const fetchLCProfile = async (username) => {
  const query = {
    query: `
      query lcProfile($username: String!) {
        matchedUser(username: $username) {
          profile { ranking }
          submitStatsGlobal {
            acSubmissionNum { difficulty count }
          }
          userCalendar {
            submissionCalendar
            streak
            totalActiveDays
          }
        }
        recentAcSubmissionList(username: $username, limit: 100) {
          id title titleSlug timestamp
        }
      }`,
    variables: { username }
  };
  const res = await axios.post(LC_GQL, query, { headers: HEADERS, timeout: 15000 });
  return res.data?.data;
};

// ── 2. Fetch tags + difficulty for a single problem slug ─────────────────────
const fetchProblemMeta = async (titleSlug) => {
  const query = {
    query: `
      query questionMeta($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          difficulty
          topicTags { name slug }
        }
      }`,
    variables: { titleSlug }
  };
  try {
    const res = await axios.post(LC_GQL, query, { headers: HEADERS, timeout: 8000 });
    const q = res.data?.data?.question;
    return {
      difficulty: q?.difficulty || 'Unknown',
      tags: (q?.topicTags || []).map(t => t.name)
    };
  } catch {
    return { difficulty: 'Unknown', tags: [] };
  }
};

// ── Main sync handler ────────────────────────────────────────────────────────
const syncLeetCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const username = req.body.handle || user.handles?.leetcode;

    if (!username) {
      return res.status(400).json({ msg: 'Please set your LeetCode handle in Settings.' });
    }

    // Fetch profile
    let data;
    try {
      data = await fetchLCProfile(username);
    } catch (err) {
      return res.status(502).json({
        error: 'Could not reach LeetCode API. Their servers may be rate-limiting server requests.',
        detail: err.message
      });
    }

    if (!data?.matchedUser) {
      return res.status(404).json({ error: 'LeetCode user not found or profile is private.' });
    }

    const { matchedUser, recentAcSubmissionList } = data;

    // ── Store aggregate stats + calendar in User ──────────────────────────────
    const acNums = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const lcStats = {
      easy:    acNums.find(x => x.difficulty === 'Easy')?.count   || 0,
      medium:  acNums.find(x => x.difficulty === 'Medium')?.count || 0,
      hard:    acNums.find(x => x.difficulty === 'Hard')?.count   || 0,
      total:   acNums.find(x => x.difficulty === 'All')?.count    || 0,
      ranking: matchedUser.profile?.ranking || 0
    };

    // submissionCalendar is a JSON string like '{"1700000000":3,...}'
    let lcCalendar = {};
    try {
      const raw = matchedUser.userCalendar?.submissionCalendar;
      lcCalendar = raw ? JSON.parse(raw) : {};
    } catch { /* keep empty */ }

    await User.findByIdAndUpdate(req.user.id, { lcStats, lcCalendar });

    // ── Deduplicate submissions by titleSlug ───────────────────────────────────
    const submissions = Array.isArray(recentAcSubmissionList) ? recentAcSubmissionList : [];
    const uniqueMap = new Map();
    submissions.forEach(s => {
      if (!uniqueMap.has(s.titleSlug)) uniqueMap.set(s.titleSlug, s);
    });
    const uniqueSubs = [...uniqueMap.values()];

    if (uniqueSubs.length === 0) {
      return res.json({ message: 'LeetCode synced (no recent submissions found).', countSynced: 0, lcStats });
    }

    // ── Fetch problem meta (difficulty + tags) for unknown problems ────────────
    // Check what we already have in DB to avoid re-fetching
    const existingProbs = await Problem.find({
      userId: req.user.id,
      platform: 'LeetCode',
      problemId: { $in: uniqueSubs.map(s => s.titleSlug) }
    }).select('problemId difficulty tags');

    const knownMeta = {};
    existingProbs.forEach(p => {
      if (p.difficulty && p.difficulty !== 'Unknown') {
        knownMeta[p.problemId] = { difficulty: p.difficulty, tags: p.tags || [] };
      }
    });

    // Only fetch meta for problems we don't know yet (rate-limited to 5 at a time)
    const unknownSlugs = uniqueSubs.map(s => s.titleSlug).filter(s => !knownMeta[s]);
    console.log(`[LC] Fetching meta for ${unknownSlugs.length} new problems...`);

    const metaBatch = Math.min(unknownSlugs.length, 30); // cap at 30 to avoid timeout
    for (let i = 0; i < metaBatch; i++) {
      const slug = unknownSlugs[i];
      knownMeta[slug] = await fetchProblemMeta(slug);
      if (i > 0 && i % 5 === 0) await sleep(500); // small delay every 5 requests
    }

    // ── Bulk upsert ────────────────────────────────────────────────────────────
    const ops = uniqueSubs.map(sub => {
      const meta = knownMeta[sub.titleSlug] || { difficulty: 'Unknown', tags: [] };
      return {
        updateOne: {
          filter: { problemId: sub.titleSlug, userId: req.user.id },
          update: {
            $set: {
              userId: req.user.id,
              problemId: sub.titleSlug,
              title: sub.title,
              platform: 'LeetCode',
              difficulty: meta.difficulty,
              tags: meta.tags,
              syncedAt: sub.timestamp ? new Date(parseInt(sub.timestamp) * 1000) : new Date()
            }
          },
          upsert: true
        }
      };
    });

    await Problem.bulkWrite(ops);

    res.json({
      message: 'LeetCode synced!',
      countSynced: uniqueSubs.length,
      lcStats,
      calendarDays: Object.keys(lcCalendar).length,
      note: lcStats.total > uniqueSubs.length
        ? `Your actual total is ${lcStats.total} problems. LeetCode API only returns the most recent ${uniqueSubs.length} to unauthenticated servers.`
        : undefined
    });

  } catch (error) {
    console.error('LeetCode Sync Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { syncLeetCode };