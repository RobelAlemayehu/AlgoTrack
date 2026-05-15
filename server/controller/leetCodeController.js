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
  'x-csrftoken': 'dummy',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Fetch profile stats + calendar
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
          }
        }
      }`,
    variables: { username }
  };
  const res = await axios.post(LC_GQL, query, { headers: HEADERS, timeout: 15000 });
  return res.data?.data;
};

// Fetch all AC submissions via paginated submissionList
const fetchAllACSubs = async (username) => {
  const PAGE_SIZE = 20;
  let offset = 0;
  const allSubs = new Map(); // titleSlug -> sub (deduplicated)

  while (true) {
    const query = {
      query: `
        query submissions($username: String!, $limit: Int!, $offset: Int!) {
          submissionList(username: $username, limit: $limit, offset: $offset) {
            hasNext
            submissions {
              id
              title
              titleSlug
              timestamp
              statusDisplay
            }
          }
        }`,
      variables: { username, limit: PAGE_SIZE, offset }
    };

    let data;
    try {
      const res = await axios.post(LC_GQL, query, { headers: HEADERS, timeout: 15000 });
      data = res.data?.data?.submissionList;
    } catch {
      break;
    }

    if (!data || !data.submissions?.length) break;

    data.submissions.forEach(s => {
      if (s.statusDisplay === 'Accepted' && !allSubs.has(s.titleSlug)) {
        allSubs.set(s.titleSlug, s);
      }
    });

    if (!data.hasNext) break;
    offset += PAGE_SIZE;
    await sleep(300); // avoid rate limiting
  }

  return [...allSubs.values()];
};

// Fetch difficulty + tags for a single problem slug
const fetchProblemMeta = async (titleSlug) => {
  const query = {
    query: `
      query questionMeta($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          difficulty
          topicTags { name }
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

const syncLeetCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const username = req.body.handle || user.handles?.leetcode;

    if (!username) {
      return res.status(400).json({ msg: 'Please set your LeetCode handle in Settings.' });
    }

    // Fetch profile stats + calendar
    let profileData;
    try {
      profileData = await fetchLCProfile(username);
    } catch (err) {
      return res.status(502).json({ error: 'Could not reach LeetCode API.', detail: err.message });
    }

    if (!profileData?.matchedUser) {
      return res.status(404).json({ error: 'LeetCode user not found or profile is private.' });
    }

    const { matchedUser } = profileData;

    // Build lcStats
    const acNums = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const lcStats = {
      easy:    acNums.find(x => x.difficulty === 'Easy')?.count   || 0,
      medium:  acNums.find(x => x.difficulty === 'Medium')?.count || 0,
      hard:    acNums.find(x => x.difficulty === 'Hard')?.count   || 0,
      total:   acNums.find(x => x.difficulty === 'All')?.count    || 0,
      ranking: matchedUser.profile?.ranking || 0
    };

    // Parse calendar
    let lcCalendar = {};
    try {
      const raw = matchedUser.userCalendar?.submissionCalendar;
      lcCalendar = raw ? JSON.parse(raw) : {};
    } catch { /* keep empty */ }

    await User.findByIdAndUpdate(req.user.id, { lcStats, lcCalendar });

    // Fetch all AC submissions via pagination
    const uniqueSubs = await fetchAllACSubs(username);

    if (uniqueSubs.length === 0) {
      return res.json({ message: 'LeetCode synced (no submissions found).', countSynced: 0, lcStats });
    }

    // Check existing problems to avoid re-fetching meta
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

    // Fetch meta only for new/unknown problems (cap at 50 per sync to avoid timeout)
    const unknownSlugs = uniqueSubs.map(s => s.titleSlug).filter(s => !knownMeta[s]);
    const metaBatch = Math.min(unknownSlugs.length, 50);
    for (let i = 0; i < metaBatch; i++) {
      knownMeta[unknownSlugs[i]] = await fetchProblemMeta(unknownSlugs[i]);
      if (i > 0 && i % 5 === 0) await sleep(400);
    }

    // Bulk upsert
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
      note: lcStats.total > uniqueSubs.length
        ? `Synced ${uniqueSubs.length} unique problems. Total AC count is ${lcStats.total} (includes duplicates across contests).`
        : undefined
    });

  } catch (error) {
    console.error('LeetCode Sync Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { syncLeetCode };
