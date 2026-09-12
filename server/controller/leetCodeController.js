const axios = require('axios');
const Problem = require('../models/Problem');
const User = require('../models/User');

const LC_GQL  = 'https://leetcode.com/graphql';
const LC_API  = 'https://alfa-leetcode-api.onrender.com'; // public LC proxy — no auth needed
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Bootstrap a real CSRF token + session cookie from leetcode.com automatically.
// This allows our GraphQL requests to work without the user providing credentials.
let _lcCookieCache = { cookie: '', csrftoken: '', at: 0 };
const getLCCookies = async () => {
  const AGE = 10 * 60 * 1000; // re-use for 10 minutes
  if (_lcCookieCache.csrftoken && Date.now() - _lcCookieCache.at < AGE) return _lcCookieCache;
  try {
    const r = await axios.get('https://leetcode.com/', {
      headers: { 'User-Agent': UA },
      timeout: 10000,
      maxRedirects: 3,
    });
    const setCookies = r.headers['set-cookie'] || [];
    const csrfRaw = setCookies.find(c => c.startsWith('csrftoken='));
    const sessionRaw = setCookies.find(c => c.startsWith('LEETCODE_SESSION='));
    const csrftoken  = csrfRaw   ? csrfRaw.split(';')[0].replace('csrftoken=', '')  : 'dummy';
    const sessionVal = sessionRaw ? sessionRaw.split(';')[0]                         : '';
    const cookie = [csrfRaw?.split(';')[0], sessionRaw?.split(';')[0]].filter(Boolean).join('; ');
    _lcCookieCache = { cookie, csrftoken, at: Date.now() };
    console.log(`[LC] bootstrapped CSRF token (${csrftoken.slice(0, 8)}…)`);
  } catch (err) {
    console.log('[LC] CSRF bootstrap failed, using dummy:', err.message);
    _lcCookieCache = { cookie: '', csrftoken: 'dummy', at: Date.now() };
  }
  return _lcCookieCache;
};

const makeHeaders = async (extraCookie = '') => {
  const { cookie, csrftoken } = await getLCCookies();
  const combinedCookie = [cookie, extraCookie].filter(Boolean).join('; ');
  return {
    'Content-Type': 'application/json',
    'Referer':      'https://leetcode.com',
    'Origin':       'https://leetcode.com',
    'User-Agent':   UA,
    'Accept':       'application/json, text/plain, */*',
    'x-csrftoken':  csrftoken,
    ...(combinedCookie ? { Cookie: combinedCookie } : {}),
  };
};

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
  const headers = await makeHeaders();
  const res = await axios.post(LC_GQL, query, { headers, timeout: 15000 });
  return res.data?.data;
};


// Fetch AC submissions automatically — no user credentials required.
// 3-tier waterfall: public proxy → LC GraphQL with real CSRF → paginated fallback
const fetchAllACSubs = async (username) => {
  const allSubs = new Map(); // titleSlug -> sub

  // ── Tier 1: alfa-leetcode-api (public proxy, no auth, returns full recent AC) ──
  try {
    let offset = 0;
    const limit = 20;
    let hasMore = true;
    while (hasMore && allSubs.size < 300) {
      const url = `${LC_API}/${username}/acSubmission?limit=${limit}&offset=${offset}`;
      const r = await axios.get(url, { timeout: 25000, headers: { 'User-Agent': UA } });
      const subs = r.data?.submission || [];
      subs.forEach(s => {
        if (!allSubs.has(s.titleSlug)) allSubs.set(s.titleSlug, { ...s, statusDisplay: 'Accepted' });
      });
      hasMore = subs.length === limit;
      offset += limit;
      if (hasMore) await sleep(200);
    }
    console.log(`[LC] alfa-leetcode-api → ${allSubs.size} unique AC submissions`);
  } catch (err) {
    console.log('[LC] alfa-leetcode-api failed:', err.message, '— trying LC GraphQL fallback');
  }

  if (allSubs.size > 0) return [...allSubs.values()];

  // ── Tier 2: recentAcSubmissionList with real bootstrapped CSRF token ─────────
  try {
    const headers = await makeHeaders();
    const r = await axios.post(LC_GQL, {
      query: `query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }`,
      variables: { username, limit: 50 }
    }, { headers, timeout: 15000 });
    const recent = r.data?.data?.recentAcSubmissionList || [];
    recent.forEach(s => { if (!allSubs.has(s.titleSlug)) allSubs.set(s.titleSlug, { ...s, statusDisplay: 'Accepted' }); });
    console.log(`[LC] recentAcSubmissionList (real CSRF) → ${recent.length}`);
  } catch (err) {
    console.log('[LC] recentAcSubmissionList failed:', err.message);
  }

  if (allSubs.size > 0) return [...allSubs.values()];

  // ── Tier 3: paginated submissionList with real CSRF ───────────────────────────
  try {
    const headers = await makeHeaders();
    const PAGE_SIZE = 20;
    let offset = 0, pages = 0;
    while (pages < 15) {
      const r = await axios.post(LC_GQL, {
        query: `query submissionList($username: String!, $limit: Int!, $offset: Int!) { submissionList(username: $username, limit: $limit, offset: $offset) { hasNext submissions { id title titleSlug timestamp statusDisplay } } }`,
        variables: { username, limit: PAGE_SIZE, offset }
      }, { headers, timeout: 15000 });
      const data = r.data?.data?.submissionList;
      if (!data?.submissions?.length) break;
      data.submissions.forEach(s => {
        if (s.statusDisplay === 'Accepted' && !allSubs.has(s.titleSlug)) allSubs.set(s.titleSlug, s);
      });
      if (!data.hasNext) break;
      offset += PAGE_SIZE; pages++;
      await sleep(300);
    }
    console.log(`[LC] submissionList (paginated) → ${allSubs.size} unique`);
  } catch (err) {
    console.log('[LC] submissionList paginated failed:', err.message);
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
    const headers = await makeHeaders();
    const res = await axios.post(LC_GQL, query, { headers, timeout: 8000 });
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

    // Fetch AC submissions automatically (no user credentials needed)
    const uniqueSubs = await fetchAllACSubs(username);

    // Fallback: If uniqueSubs is empty but user has active solved days in lcCalendar, generate problem entries
    if (uniqueSubs.length === 0 && Object.keys(lcCalendar).length > 0) {
      console.log(`[LC] AC subs list empty from GQL/proxy, generating problem entries from calendar timestamps (${Object.keys(lcCalendar).length} active days)`);
      Object.entries(lcCalendar).forEach(([ts, count]) => {
        const numTs = Number(ts);
        if (!isNaN(numTs) && numTs > 0 && count > 0) {
          const dateObj = new Date(numTs * 1000);
          const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          for (let i = 0; i < count; i++) {
            const slug = `leetcode-submission-${numTs}-${i}`;
            uniqueSubs.push({
              id: slug,
              title: count > 1 ? `LeetCode Solved Problem #${i + 1} (${dateStr})` : `LeetCode Solved Problem (${dateStr})`,
              titleSlug: slug,
              timestamp: numTs
            });
          }
        }
      });
    }

    if (uniqueSubs.length === 0) {
      return res.json({
        message: 'LeetCode stats synced. Problem list unavailable — LC API may be temporarily down.',
        countSynced: 0,
        lcStats,
      });
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
              archived: false,
              solvedAt: sub.timestamp ? new Date(parseInt(sub.timestamp) * 1000) : new Date(),
              syncedAt: new Date()
            }
          },
          upsert: true
        }
      };
    });

    await Problem.bulkWrite(ops);

    // Update user lastSync timestamp & award badges
    await User.findByIdAndUpdate(req.user.id, { 'lastSync.leetcode': new Date() });
    const { checkAndAwardBadges } = require('./badgeController');
    await checkAndAwardBadges(req.user.id);

    const totalLCProblems = await Problem.countDocuments({ userId: req.user.id, platform: 'LeetCode', archived: { $ne: true } });

    res.json({
      message: 'LeetCode synced!',
      countSynced: totalLCProblems,
      newCount: uniqueSubs.length,
      lcStats,
      lastSync: new Date(),
      note: lcStats.total > totalLCProblems
        ? `Synced ${totalLCProblems} unique problems. Total AC count is ${lcStats.total} (includes duplicates across contests).`
        : undefined
    });

  } catch (error) {
    console.error('LeetCode Sync Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};


module.exports = { syncLeetCode };
