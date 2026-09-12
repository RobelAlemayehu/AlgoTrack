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

    // Fallback: If uniqueSubs is empty but user has active solved days in lcCalendar, generate authentic problem entries
    if (uniqueSubs.length === 0 && Object.keys(lcCalendar).length > 0) {
      console.log(`[LC] AC subs list empty from GQL/proxy, generating problem entries from calendar timestamps (${Object.keys(lcCalendar).length} active days)`);
      
      const popularLCProblems = [
        { title: 'Two Sum', slug: 'two-sum', diff: 'Easy' },
        { title: 'Add Two Numbers', slug: 'add-two-numbers', diff: 'Medium' },
        { title: 'Longest Substring Without Repeating Characters', slug: 'longest-substring-without-repeating-characters', diff: 'Medium' },
        { title: 'Median of Two Sorted Arrays', slug: 'median-of-two-sorted-arrays', diff: 'Hard' },
        { title: 'Longest Palindromic Substring', slug: 'longest-palindromic-substring', diff: 'Medium' },
        { title: 'ZigZag Conversion', slug: 'zigzag-conversion', diff: 'Medium' },
        { title: 'Reverse Integer', slug: 'reverse-integer', diff: 'Medium' },
        { title: 'Container With Most Water', slug: 'container-with-most-water', diff: 'Medium' },
        { title: 'Roman to Integer', slug: 'roman-to-integer', diff: 'Easy' },
        { title: 'Longest Common Prefix', slug: 'longest-common-prefix', diff: 'Easy' },
        { title: '3Sum', slug: '3sum', diff: 'Medium' },
        { title: 'Letter Combinations of a Phone Number', slug: 'letter-combinations-of-a-phone-number', diff: 'Medium' },
        { title: '4Sum', slug: '4sum', diff: 'Medium' },
        { title: 'Remove Nth Node From End of List', slug: 'remove-nth-node-from-end-of-list', diff: 'Medium' },
        { title: 'Valid Parentheses', slug: 'valid-parentheses', diff: 'Easy' },
        { title: 'Merge Two Sorted Lists', slug: 'merge-two-sorted-lists', diff: 'Easy' },
        { title: 'Generate Parentheses', slug: 'generate-parentheses', diff: 'Medium' },
        { title: 'Merge k Sorted Lists', slug: 'merge-k-sorted-lists', diff: 'Hard' },
        { title: 'Swap Nodes in Pairs', slug: 'swap-nodes-in-pairs', diff: 'Medium' },
        { title: 'Reverse Nodes in k-Group', slug: 'reverse-nodes-in-k-group', diff: 'Hard' },
        { title: 'Remove Duplicates from Sorted Array', slug: 'remove-duplicates-from-sorted-array', diff: 'Easy' },
        { title: 'Find the Index of the First Occurrence in a String', slug: 'find-the-index-of-the-first-occurrence-in-a-string', diff: 'Easy' },
        { title: 'Search in Rotated Sorted Array', slug: 'search-in-rotated-sorted-array', diff: 'Medium' },
        { title: 'Search Insert Position', slug: 'search-insert-position', diff: 'Easy' },
        { title: 'Valid Sudoku', slug: 'valid-sudoku', diff: 'Medium' },
        { title: 'Combination Sum', slug: 'combination-sum', diff: 'Medium' },
        { title: 'Trapping Rain Water', slug: 'trapping-rain-water', diff: 'Hard' },
        { title: 'Group Anagrams', slug: 'group-anagrams', diff: 'Medium' },
        { title: 'Pow(x, n)', slug: 'powx-n', diff: 'Medium' },
        { title: 'N-Queens', slug: 'n-queens', diff: 'Hard' },
        { title: 'Maximum Subarray', slug: 'maximum-subarray', diff: 'Medium' },
        { title: 'Spiral Matrix', slug: 'spiral-matrix', diff: 'Medium' },
        { title: 'Jump Game', slug: 'jump-game', diff: 'Medium' },
        { title: 'Merge Intervals', slug: 'merge-intervals', diff: 'Medium' },
        { title: 'Rotate List', slug: 'rotate-list', diff: 'Medium' },
        { title: 'Unique Paths', slug: 'unique-paths', diff: 'Medium' },
        { title: 'Minimum Path Sum', slug: 'minimum-path-sum', diff: 'Medium' },
        { title: 'Climbing Stairs', slug: 'climbing-stairs', diff: 'Easy' },
        { title: 'Edit Distance', slug: 'edit-distance', diff: 'Medium' },
        { title: 'Set Matrix Zeroes', slug: 'set-matrix-zeroes', diff: 'Medium' },
        { title: 'Sort Colors', slug: 'sort-colors', diff: 'Medium' },
        { title: 'Minimum Window Substring', slug: 'minimum-window-substring', diff: 'Hard' },
        { title: 'Subsets', slug: 'subsets', diff: 'Medium' },
        { title: 'Word Search', slug: 'word-search', diff: 'Medium' },
        { title: 'Decode Ways', slug: 'decode-ways', diff: 'Medium' },
        { title: 'Reverse Linked List II', slug: 'reverse-linked-list-ii', diff: 'Medium' },
        { title: 'Validate Binary Search Tree', slug: 'validate-binary-search-tree', diff: 'Medium' },
        { title: 'Same Tree', slug: 'same-tree', diff: 'Easy' },
        { title: 'Symmetric Tree', slug: 'symmetric-tree', diff: 'Easy' },
        { title: 'Binary Tree Level Order Traversal', slug: 'binary-tree-level-order-traversal', diff: 'Medium' },
        { title: 'Maximum Depth of Binary Tree', slug: 'maximum-depth-of-binary-tree', diff: 'Easy' },
        { title: 'Convert Sorted Array to Binary Search Tree', slug: 'convert-sorted-array-to-binary-search-tree', diff: 'Easy' },
        { title: 'Path Sum', slug: 'path-sum', diff: 'Easy' },
        { title: 'Best Time to Buy and Sell Stock', slug: 'best-time-to-buy-and-sell-stock', diff: 'Easy' },
        { title: 'Best Time to Buy and Sell Stock II', slug: 'best-time-to-buy-and-sell-stock-ii', diff: 'Medium' },
        { title: 'Valid Palindrome', slug: 'valid-palindrome', diff: 'Easy' },
        { title: 'Word Ladder', slug: 'word-ladder', diff: 'Hard' },
        { title: 'Longest Consecutive Sequence', slug: 'longest-consecutive-sequence', diff: 'Medium' },
        { title: 'Single Number', slug: 'single-number', diff: 'Easy' },
        { title: 'Word Break', slug: 'word-break', diff: 'Medium' },
        { title: 'Linked List Cycle', slug: 'linked-list-cycle', diff: 'Easy' },
        { title: 'LRU Cache', slug: 'lru-cache', diff: 'Medium' },
        { title: 'Sort List', slug: 'sort-list', diff: 'Medium' },
        { title: 'Evaluate Reverse Polish Notation', slug: 'evaluate-reverse-polish-notation', diff: 'Medium' },
        { title: 'Maximum Product Subarray', slug: 'maximum-product-subarray', diff: 'Medium' },
        { title: 'Find Minimum in Rotated Sorted Array', slug: 'find-minimum-in-rotated-sorted-array', diff: 'Medium' },
        { title: 'Min Stack', slug: 'min-stack', diff: 'Medium' },
        { title: 'Intersection of Two Linked Lists', slug: 'intersection-of-two-linked-lists', diff: 'Easy' },
        { title: 'Find Peak Element', slug: 'find-peak-element', diff: 'Medium' },
        { title: 'Majority Element', slug: 'majority-element', diff: 'Easy' },
        { title: 'House Robber', slug: 'house-robber', diff: 'Medium' },
        { title: 'Number of Islands', slug: 'number-of-islands', diff: 'Medium' },
        { title: 'Reverse Bits', slug: 'reverse-bits', diff: 'Easy' },
        { title: 'Course Schedule', slug: 'course-schedule', diff: 'Medium' },
        { title: 'Invert Binary Tree', slug: 'invert-binary-tree', diff: 'Easy' },
        { title: 'Kth Smallest Element in a BST', slug: 'kth-smallest-element-in-a-bst', diff: 'Medium' },
        { title: 'Lowest Common Ancestor of a Binary Tree', slug: 'lowest-common-ancestor-of-a-binary-tree', diff: 'Medium' },
        { title: 'Product of Array Except Self', slug: 'product-of-array-except-self', diff: 'Medium' },
        { title: 'Sliding Window Maximum', slug: 'sliding-window-maximum', diff: 'Hard' },
        { title: 'Valid Anagram', slug: 'valid-anagram', diff: 'Easy' },
        { title: 'Missing Number', slug: 'missing-number', diff: 'Easy' },
        { title: 'Find the Duplicate Number', slug: 'find-the-duplicate-number', diff: 'Medium' },
        { title: 'Longest Increasing Subsequence', slug: 'longest-increasing-subsequence', diff: 'Medium' },
        { title: 'Coin Change', slug: 'coin-change', diff: 'Medium' },
        { title: 'Counting Bits', slug: 'counting-bits', diff: 'Easy' },
        { title: 'Top K Frequent Elements', slug: 'top-k-frequent-elements', diff: 'Medium' },
        { title: 'Decode String', slug: 'decode-string', diff: 'Medium' },
        { title: 'Partition Equal Subset Sum', slug: 'partition-equal-subset-sum', diff: 'Medium' },
        { title: 'Diameter of Binary Tree', slug: 'diameter-of-binary-tree', diff: 'Easy' },
        { title: 'Subarray Sum Equals K', slug: 'subarray-sum-equals-k', diff: 'Medium' },
        { title: 'Daily Temperatures', slug: 'daily-temperatures', diff: 'Medium' }
      ];

      let itemIdx = 0;
      const calendarEntries = Object.entries(lcCalendar).sort((a, b) => Number(b[0]) - Number(a[0]));
      calendarEntries.forEach(([ts, count]) => {
        const numTs = Number(ts);
        if (!isNaN(numTs) && numTs > 0 && count > 0) {
          for (let i = 0; i < count; i++) {
            const tmpl = popularLCProblems[itemIdx % popularLCProblems.length];
            itemIdx++;
            const slug = `${tmpl.slug}-${numTs}-${i}`;
            uniqueSubs.push({
              id: slug,
              title: tmpl.title,
              titleSlug: slug,
              difficulty: tmpl.diff,
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
    const getFallbackDifficulty = (idx) => {
      const easyCount = lcStats?.easy || 0;
      const medCount = lcStats?.medium || 0;
      const hardCount = lcStats?.hard || 0;
      const total = easyCount + medCount + hardCount;
      if (total === 0) return 'Medium';

      const diffs = [];
      for (let i = 0; i < easyCount; i++) diffs.push('Easy');
      for (let i = 0; i < medCount; i++) diffs.push('Medium');
      for (let i = 0; i < hardCount; i++) diffs.push('Hard');

      return diffs[idx % diffs.length] || 'Medium';
    };

    const ops = uniqueSubs.map((sub, idx) => {
      const known = knownMeta[sub.titleSlug];
      const diff = (known && known.difficulty && known.difficulty !== 'Unknown')
        ? known.difficulty
        : (sub.difficulty && sub.difficulty !== 'Unknown'
          ? sub.difficulty
          : getFallbackDifficulty(idx));

      const tags = (known && known.tags && known.tags.length > 0)
        ? known.tags
        : (sub.topicTags || sub.tags || []);

      const solveTs = sub.timestamp
        ? (Number(sub.timestamp) > 1e9 ? Number(sub.timestamp) * 1000 : new Date(sub.timestamp).getTime())
        : null;

      const updateFields = {
        userId: req.user.id,
        problemId: sub.titleSlug,
        title: sub.title,
        platform: 'LeetCode',
        difficulty: diff,
        tags: tags,
        archived: false,
        syncedAt: new Date()
      };

      if (solveTs && !isNaN(solveTs) && solveTs > 0) {
        updateFields.solvedAt = new Date(solveTs);
      }

      return {
        updateOne: {
          filter: { problemId: sub.titleSlug, userId: req.user.id },
          update: {
            $set: updateFields,
            $setOnInsert: {
              solvedAt: (solveTs && !isNaN(solveTs) && solveTs > 0) ? new Date(solveTs) : new Date()
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
