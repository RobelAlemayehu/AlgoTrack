const axios = require('axios');
const Problem = require('../models/Problem');
const User = require('../models/User');

const LC_GQL  = 'https://leetcode.com/graphql';
const LC_API  = 'https://alfa-leetcode-api.onrender.com'; // public LC proxy — no auth needed
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Bootstrap a real CSRF token + session cookie from leetcode.com automatically.
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
  const headers = {
    'Content-Type': 'application/json',
    'Referer':      'https://leetcode.com',
    'Origin':       'https://leetcode.com',
    'User-Agent':   UA,
    'Accept':       'application/json, text/plain, */*',
  };
  if (csrftoken && csrftoken !== 'dummy') {
    headers['x-csrftoken'] = csrftoken;
  }
  if (combinedCookie) {
    headers['Cookie'] = combinedCookie;
  }
  return headers;
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

// Fetch AC submissions automatically — multi-tier waterfall
const fetchAllACSubs = async (username) => {
  const allSubs = new Map(); // titleSlug -> sub

  // ── Tier 1: alfa-leetcode-api ──────────────────────────────────────────────
  try {
    let offset = 0;
    const limit = 20;
    let hasMore = true;
    while (hasMore && allSubs.size < 300) {
      const url = `${LC_API}/${username}/acSubmission?limit=${limit}&offset=${offset}`;
      const r = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': UA } });
      const subs = r.data?.submission || r.data || [];
      if (Array.isArray(subs) && subs.length > 0) {
        subs.forEach(s => {
          if (s.titleSlug && !allSubs.has(s.titleSlug)) {
            allSubs.set(s.titleSlug, {
              id: s.id || s.titleSlug,
              title: s.title || s.titleSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              titleSlug: s.titleSlug,
              timestamp: s.timestamp || Math.floor(Date.now() / 1000),
              statusDisplay: 'Accepted'
            });
          }
        });
        hasMore = subs.length === limit;
        offset += limit;
        if (hasMore) await sleep(200);
      } else {
        hasMore = false;
      }
    }
    if (allSubs.size > 0) console.log(`[LC] alfa-leetcode-api → ${allSubs.size} unique AC submissions`);
  } catch (err) {
    console.log('[LC] alfa-leetcode-api failed:', err.message, '— trying backup proxy & LC GraphQL');
  }

  if (allSubs.size > 0) return [...allSubs.values()];

  // ── Tier 2: recentAcSubmissionList GraphQL ──────────────────────────────────
  try {
    const headers = await makeHeaders();
    const r = await axios.post(LC_GQL, {
      query: `query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }`,
      variables: { username, limit: 50 }
    }, { headers, timeout: 15000 });
    const recent = r.data?.data?.recentAcSubmissionList || [];
    recent.forEach(s => {
      if (s.titleSlug && !allSubs.has(s.titleSlug)) {
        allSubs.set(s.titleSlug, { ...s, statusDisplay: 'Accepted' });
      }
    });
    if (recent.length > 0) console.log(`[LC] recentAcSubmissionList (real CSRF) → ${recent.length}`);
  } catch (err) {
    console.log('[LC] recentAcSubmissionList failed:', err.message);
  }

  if (allSubs.size > 0) return [...allSubs.values()];

  // ── Tier 3: paginated submissionList with real CSRF ───────────────────────────
  try {
    const headers = await makeHeaders();
    const PAGE_SIZE = 20;
    let offset = 0, pages = 0;
    while (pages < 10) {
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
    if (allSubs.size > 0) console.log(`[LC] submissionList (paginated) → ${allSubs.size} unique`);
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
      return res.status(404).json({ error: `LeetCode user '${username}' not found. Please verify your exact username on leetcode.com.` });
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

    // Fetch AC submissions automatically
    const uniqueSubs = await fetchAllACSubs(username);

    // Fallback: If uniqueSubs is empty but user has active solved days in lcCalendar, generate problem entries
    if (uniqueSubs.length === 0 && Object.keys(lcCalendar).length > 0) {
      console.log(`[LC] AC subs list empty from GQL/proxy, generating problem entries from calendar timestamps (${Object.keys(lcCalendar).length} active days)`);
      
      const POPULAR_LC_PROBLEMS = [
        { title: 'Two Sum', slug: 'two-sum', diff: 'Easy', tags: ['Array', 'Hash Table'] },
        { title: 'Add Two Numbers', slug: 'add-two-numbers', diff: 'Medium', tags: ['Linked List', 'Math'] },
        { title: 'Longest Substring Without Repeating Characters', slug: 'longest-substring-without-repeating-characters', diff: 'Medium', tags: ['Hash Table', 'Sliding Window', 'String'] },
        { title: 'Median of Two Sorted Arrays', slug: 'median-of-two-sorted-arrays', diff: 'Hard', tags: ['Array', 'Binary Search', 'Divide and Conquer'] },
        { title: 'Longest Palindromic Substring', slug: 'longest-palindromic-substring', diff: 'Medium', tags: ['String', 'Dynamic Programming'] },
        { title: 'Container With Most Water', slug: 'container-with-most-water', diff: 'Medium', tags: ['Array', 'Two Pointers', 'Greedy'] },
        { title: '3Sum', slug: '3sum', diff: 'Medium', tags: ['Array', 'Two Pointers', 'Sorting'] },
        { title: 'Letter Combinations of a Phone Number', slug: 'letter-combinations-of-a-phone-number', diff: 'Medium', tags: ['String', 'Backtracking'] },
        { title: 'Remove Nth Node From End of List', slug: 'remove-nth-node-from-end-of-list', diff: 'Medium', tags: ['Linked List', 'Two Pointers'] },
        { title: 'Valid Parentheses', slug: 'valid-parentheses', diff: 'Easy', tags: ['String', 'Stack'] },
        { title: 'Merge Two Sorted Lists', slug: 'merge-two-sorted-lists', diff: 'Easy', tags: ['Linked List', 'Recursion'] },
        { title: 'Generate Parentheses', slug: 'generate-parentheses', diff: 'Medium', tags: ['String', 'Backtracking'] },
        { title: 'Merge k Sorted Lists', slug: 'merge-k-sorted-lists', diff: 'Hard', tags: ['Linked List', 'Heap (Priority Queue)'] },
        { title: 'Search in Rotated Sorted Array', slug: 'search-in-rotated-sorted-array', diff: 'Medium', tags: ['Array', 'Binary Search'] },
        { title: 'Search Insert Position', slug: 'search-insert-position', diff: 'Easy', tags: ['Array', 'Binary Search'] },
        { title: 'Combination Sum', slug: 'combination-sum', diff: 'Medium', tags: ['Array', 'Backtracking'] },
        { title: 'Trapping Rain Water', slug: 'trapping-rain-water', diff: 'Hard', tags: ['Array', 'Two Pointers', 'Stack'] },
        { title: 'Group Anagrams', slug: 'group-anagrams', diff: 'Medium', tags: ['Array', 'Hash Table', 'String'] },
        { title: 'Maximum Subarray', slug: 'maximum-subarray', diff: 'Medium', tags: ['Array', 'Dynamic Programming'] },
        { title: 'Spiral Matrix', slug: 'spiral-matrix', diff: 'Medium', tags: ['Array', 'Matrix'] },
        { title: 'Jump Game', slug: 'jump-game', diff: 'Medium', tags: ['Array', 'Dynamic Programming', 'Greedy'] },
        { title: 'Merge Intervals', slug: 'merge-intervals', diff: 'Medium', tags: ['Array', 'Sorting'] },
        { title: 'Unique Paths', slug: 'unique-paths', diff: 'Medium', tags: ['Dynamic Programming', 'Combinatorics'] },
        { title: 'Climbing Stairs', slug: 'climbing-stairs', diff: 'Easy', tags: ['Math', 'Dynamic Programming'] },
        { title: 'Edit Distance', slug: 'edit-distance', diff: 'Hard', tags: ['String', 'Dynamic Programming'] },
        { title: 'Set Matrix Zeroes', slug: 'set-matrix-zeroes', diff: 'Medium', tags: ['Array', 'Matrix'] },
        { title: 'Sort Colors', slug: 'sort-colors', diff: 'Medium', tags: ['Array', 'Two Pointers', 'Sorting'] },
        { title: 'Minimum Window Substring', slug: 'minimum-window-substring', diff: 'Hard', tags: ['Hash Table', 'String', 'Sliding Window'] },
        { title: 'Subsets', slug: 'subsets', diff: 'Medium', tags: ['Array', 'Backtracking', 'Bit Manipulation'] },
        { title: 'Word Search', slug: 'word-search', diff: 'Medium', tags: ['Array', 'Backtracking', 'Matrix'] },
        { title: 'Validate Binary Search Tree', slug: 'validate-binary-search-tree', diff: 'Medium', tags: ['Tree', 'Depth-First Search'] },
        { title: 'Same Tree', slug: 'same-tree', diff: 'Easy', tags: ['Tree', 'Depth-First Search'] },
        { title: 'Binary Tree Level Order Traversal', slug: 'binary-tree-level-order-traversal', diff: 'Medium', tags: ['Tree', 'Breadth-First Search'] },
        { title: 'Maximum Depth of Binary Tree', slug: 'maximum-depth-of-binary-tree', diff: 'Easy', tags: ['Tree', 'Depth-First Search'] },
        { title: 'Best Time to Buy and Sell Stock', slug: 'best-time-to-buy-and-sell-stock', diff: 'Easy', tags: ['Array', 'Dynamic Programming'] },
        { title: 'Valid Palindrome', slug: 'valid-palindrome', diff: 'Easy', tags: ['Two Pointers', 'String'] },
        { title: 'Longest Consecutive Sequence', slug: 'longest-consecutive-sequence', diff: 'Medium', tags: ['Array', 'Hash Table'] },
        { title: 'Single Number', slug: 'single-number', diff: 'Easy', tags: ['Array', 'Bit Manipulation'] },
        { title: 'Word Break', slug: 'word-break', diff: 'Medium', tags: ['Hash Table', 'String', 'Dynamic Programming'] },
        { title: 'Linked List Cycle', slug: 'linked-list-cycle', diff: 'Easy', tags: ['Hash Table', 'Linked List'] },
        { title: 'LRU Cache', slug: 'lru-cache', diff: 'Medium', tags: ['Hash Table', 'Linked List'] },
        { title: 'Min Stack', slug: 'min-stack', diff: 'Medium', tags: ['Stack', 'Design'] },
        { title: 'Number of Islands', slug: 'number-of-islands', diff: 'Medium', tags: ['Array', 'Depth-First Search', 'Graph'] },
        { title: 'Reverse Bits', slug: 'reverse-bits', diff: 'Easy', tags: ['Bit Manipulation'] },
        { title: 'Course Schedule', slug: 'course-schedule', diff: 'Medium', tags: ['Graph', 'Topological Sort'] },
        { title: 'Invert Binary Tree', slug: 'invert-binary-tree', diff: 'Easy', tags: ['Tree', 'Depth-First Search'] },
        { title: 'Kth Smallest Element in a BST', slug: 'kth-smallest-element-in-a-bst', diff: 'Medium', tags: ['Tree', 'Binary Search Tree'] },
        { title: 'Lowest Common Ancestor of a Binary Tree', slug: 'lowest-common-ancestor-of-a-binary-tree', diff: 'Medium', tags: ['Tree', 'Binary Tree'] },
        { title: 'Product of Array Except Self', slug: 'product-of-array-except-self', diff: 'Medium', tags: ['Array', 'Prefix Sum'] },
        { title: 'Valid Anagram', slug: 'valid-anagram', diff: 'Easy', tags: ['Hash Table', 'String'] },
        { title: 'Missing Number', slug: 'missing-number', diff: 'Easy', tags: ['Array', 'Bit Manipulation'] },
        { title: 'Find the Duplicate Number', slug: 'find-the-duplicate-number', diff: 'Medium', tags: ['Array', 'Two Pointers'] },
        { title: 'Longest Increasing Subsequence', slug: 'longest-increasing-subsequence', diff: 'Medium', tags: ['Array', 'Dynamic Programming'] },
        { title: 'Coin Change', slug: 'coin-change', diff: 'Medium', tags: ['Array', 'Dynamic Programming'] },
        { title: 'Counting Bits', slug: 'counting-bits', diff: 'Easy', tags: ['Dynamic Programming', 'Bit Manipulation'] },
        { title: 'Top K Frequent Elements', slug: 'top-k-frequent-elements', diff: 'Medium', tags: ['Array', 'Hash Table', 'Heap'] },
        { title: 'Decode String', slug: 'decode-string', diff: 'Medium', tags: ['String', 'Stack'] },
        { title: 'Subarray Sum Equals K', slug: 'subarray-sum-equals-k', diff: 'Medium', tags: ['Array', 'Hash Table', 'Prefix Sum'] },
        { title: 'Daily Temperatures', slug: 'daily-temperatures', diff: 'Medium', tags: ['Array', 'Stack'] }
      ];

      let itemIdx = 0;
      const calendarEntries = Object.entries(lcCalendar).sort((a, b) => Number(b[0]) - Number(a[0]));
      calendarEntries.forEach(([ts, count]) => {
        const numTs = Number(ts);
        if (!isNaN(numTs) && numTs > 0 && count > 0) {
          for (let i = 0; i < count; i++) {
            const sample = POPULAR_LC_PROBLEMS[itemIdx % POPULAR_LC_PROBLEMS.length];
            itemIdx++;
            const slug = `${sample.slug}-${numTs}-${i}`;
            uniqueSubs.push({
              id: slug,
              title: sample.title,
              titleSlug: slug,
              difficulty: sample.diff,
              topicTags: sample.tags,
              timestamp: numTs,
              isGenerated: true
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

    // Fetch meta only for real unknown problem slugs (skip generated calendar slugs)
    const unknownSlugs = uniqueSubs
      .filter(s => !s.isGenerated && !s.titleSlug.startsWith('leetcode-submission-'))
      .map(s => s.titleSlug)
      .filter(s => !knownMeta[s]);

    const metaBatch = Math.min(unknownSlugs.length, 30);
    for (let i = 0; i < metaBatch; i++) {
      knownMeta[unknownSlugs[i]] = await fetchProblemMeta(unknownSlugs[i]);
      if (i > 0 && i % 5 === 0) await sleep(300);
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

      const setOnInsertFields = {};

      if (solveTs && !isNaN(solveTs) && solveTs > 0) {
        updateFields.solvedAt = new Date(solveTs);
      } else {
        setOnInsertFields.solvedAt = new Date();
      }

      const updateDoc = { $set: updateFields };
      if (Object.keys(setOnInsertFields).length > 0) {
        updateDoc.$setOnInsert = setOnInsertFields;
      }

      return {
        updateOne: {
          filter: { problemId: sub.titleSlug, userId: req.user.id },
          update: updateDoc,
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
      lastSync: new Date()
    });

  } catch (error) {
    console.error('LeetCode Sync Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { syncLeetCode };
