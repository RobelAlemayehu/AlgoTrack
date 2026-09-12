const axios = require('axios');
const Problem = require('../models/Problem');
const User = require('../models/User');

/**
 * GET /api/recommend
 * Returns unsolved CF problems matching the user's weak tags at an appropriate rating.
 */
const getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const problems = await Problem.find({ userId: req.user.id });

    const cfSolved = problems.filter(p => p.platform === 'Codeforces');
    const lcSolved = problems.filter(p => p.platform === 'LeetCode');

    const solvedIds = new Set(cfSolved.map(p => p.problemId));

    // ── Identify weak tags (tags with fewest solutions) ──────────────────────
    const tagCounts = {};
    cfSolved.forEach(p => (p.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));

    // All tags that appear in CF problemset (common ones for recommendations)
    const COMMON_TAGS = [
      'implementation', 'math', 'greedy', 'dp', 'data structures',
      'brute force', 'constructive algorithms', 'graphs', 'sortings',
      'binary search', 'trees', 'strings', 'number theory', 'two pointers',
      'dfs and similar', 'bitmasks', 'combinatorics', 'geometry'
    ];

    // Sort tags: prioritize ones with 0 or low count
    const weakTags = COMMON_TAGS
      .map(t => ({ tag: t, count: tagCounts[t] || 0 }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 3)
      .map(t => t.tag);

    // ── Determine target rating range ─────────────────────────────────────────
    const cfRating = user.cfRating || 0;
    let minRating, maxRating;
    if (cfRating < 800)       { minRating = 800;  maxRating = 1200; }
    else if (cfRating < 1200) { minRating = 900;  maxRating = 1400; }
    else if (cfRating < 1600) { minRating = 1200; maxRating = 1700; }
    else if (cfRating < 2000) { minRating = 1600; maxRating = 2100; }
    else                       { minRating = 1900; maxRating = 2500; }

    // ── Fetch CF problems for each weak tag ───────────────────────────────────
    const recommendations = [];
    const seen = new Set();

    for (const tag of weakTags) {
      try {
        const cfRes = await axios.get(
          `https://codeforces.com/api/problemset.problems?tags=${encodeURIComponent(tag)}`,
          { family: 4, timeout: 10000 }
        );
        if (cfRes.data.status !== 'OK') continue;

        const probs = cfRes.data.result.problems || [];

        const filtered = probs
          .filter(p => {
            const id = `CF-${p.contestId}${p.index}`;
            const rating = p.rating || 0;
            return (
              !solvedIds.has(id) &&
              !seen.has(id) &&
              rating >= minRating &&
              rating <= maxRating &&
              p.contestId // skip problems without contest
            );
          })
          .sort((a, b) => (a.rating || 0) - (b.rating || 0)) // easiest first
          .slice(0, 4);

        filtered.forEach(p => {
          const id = `CF-${p.contestId}${p.index}`;
          seen.add(id);
          recommendations.push({
            id,
            title: p.name,
            platform: 'Codeforces',
            rating: p.rating || null,
            tags: p.tags || [],
            url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
            reason: `You've only solved ${tagCounts[tag] || 0} ${tag} problems — this is a great next step!`
          });
        });
      } catch (err) {
        console.log(`[Recommend] CF fetch failed for tag "${tag}":`, err.message);
      }
    }

    // ── LeetCode difficulty-based recommendations ──────────────────────────────
    const lcStats = user.lcStats || {};
    const lcEasy   = lcStats.easy   || lcSolved.filter(p => p.difficulty?.toLowerCase() === 'easy').length;
    const lcMedium = lcStats.medium || lcSolved.filter(p => p.difficulty?.toLowerCase() === 'medium').length;
    const lcHard   = lcStats.hard   || lcSolved.filter(p => p.difficulty?.toLowerCase() === 'hard').length;

    // Determine what LC difficulty to push them towards
    let lcTargetDiff = 'Easy';
    if (lcEasy >= 30 && lcMedium < 20)      lcTargetDiff = 'Medium';
    else if (lcMedium >= 40 && lcHard < 10) lcTargetDiff = 'Hard';
    else if (lcEasy >= 10)                  lcTargetDiff = 'Medium';

    // Suggest popular LC problem categories (we can't query "unsolved" without auth)
    const LC_SUGGESTIONS = {
      Easy:   [
        { title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/', tags: ['Array', 'Hash Table'] },
        { title: 'Valid Parentheses', url: 'https://leetcode.com/problems/valid-parentheses/', tags: ['Stack', 'String'] },
        { title: 'Merge Two Sorted Lists', url: 'https://leetcode.com/problems/merge-two-sorted-lists/', tags: ['Linked List'] },
        { title: 'Best Time to Buy and Sell Stock', url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', tags: ['Array', 'Greedy'] },
      ],
      Medium: [
        { title: 'Longest Substring Without Repeating Characters', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', tags: ['Sliding Window'] },
        { title: 'Add Two Numbers', url: 'https://leetcode.com/problems/add-two-numbers/', tags: ['Linked List', 'Math'] },
        { title: 'Longest Palindromic Substring', url: 'https://leetcode.com/problems/longest-palindromic-substring/', tags: ['DP', 'String'] },
        { title: 'Container With Most Water', url: 'https://leetcode.com/problems/container-with-most-water/', tags: ['Two Pointers', 'Greedy'] },
      ],
      Hard: [
        { title: 'Median of Two Sorted Arrays', url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/', tags: ['Binary Search', 'Divide & Conquer'] },
        { title: 'Regular Expression Matching', url: 'https://leetcode.com/problems/regular-expression-matching/', tags: ['DP', 'String'] },
        { title: 'Trapping Rain Water', url: 'https://leetcode.com/problems/trapping-rain-water/', tags: ['Array', 'Two Pointers', 'Stack'] },
        { title: 'Merge k Sorted Lists', url: 'https://leetcode.com/problems/merge-k-sorted-lists/', tags: ['Linked List', 'Heap'] },
      ]
    };

    // Filter out ones user has already solved (by title match)
    const solvedTitles = new Set(lcSolved.map(p => p.title?.toLowerCase()));
    const lcRecs = (LC_SUGGESTIONS[lcTargetDiff] || [])
      .filter(p => !solvedTitles.has(p.title.toLowerCase()))
      .slice(0, 4)
      .map(p => ({
        ...p,
        id: p.url,
        platform: 'LeetCode',
        difficulty: lcTargetDiff,
        reason: `You're ready to tackle ${lcTargetDiff} problems — this is a top pick!`
      }));

    res.json({
      cfRecommendations: recommendations.slice(0, 10),
      lcRecommendations: lcRecs,
      weakTags,
      targetRating: { min: minRating, max: maxRating },
      lcTargetDifficulty: lcTargetDiff
    });

  } catch (err) {
    console.error('Recommend error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/recommend/similar
 * Returns 3-5 similar unsolved problems sharing 2+ tags and a similar difficulty rating.
 * Body: { title, platform, problemId, difficulty, tags }
 */
const getSimilarProblems = async (req, res) => {
  try {
    const { title, platform, problemId, difficulty, tags } = req.body;
    const targetTags = Array.isArray(tags) ? tags : [];

    // Fetch user's non-archived solved problems
    const solvedProblems = await Problem.find({ userId: req.user.id, archived: { $ne: true } });
    const solvedIdSet = new Set(solvedProblems.map(p => (p.problemId || '').toLowerCase()));
    const solvedTitleSet = new Set(solvedProblems.map(p => (p.title || '').toLowerCase()));

    const currentRating = parseInt(difficulty) || null;
    const isCF = platform === 'Codeforces' || (problemId && /^CF-/i.test(problemId));

    const suggestions = [];

    if (isCF && targetTags.length > 0) {
      // Query Codeforces API for live unsolved problems with matching primary tag
      const primaryTag = targetTags[0];
      try {
        const cfRes = await axios.get(
          `https://codeforces.com/api/problemset.problems?tags=${encodeURIComponent(primaryTag)}`,
          { family: 4, timeout: 10000 }
        );

        if (cfRes.data.status === 'OK') {
          const probs = cfRes.data.result.problems || [];
          const candidates = [];

          probs.forEach(p => {
            const idStr = `CF-${p.contestId}${p.index}`.toLowerCase();
            if (solvedIdSet.has(idStr) || (problemId && idStr === problemId.toLowerCase())) return;
            if (solvedTitleSet.has(p.name.toLowerCase())) return;

            const pTags = p.tags || [];
            const overlap = pTags.filter(t => targetTags.includes(t));
            if (overlap.length === 0) return;

            const rating = p.rating || 1200;
            const diffRating = currentRating ? Math.abs(rating - currentRating) : 0;
            if (currentRating && diffRating > 400) return;

            const score = (overlap.length * 100) - diffRating;
            candidates.push({
              id: `CF-${p.contestId}${p.index}`,
              title: p.name,
              platform: 'Codeforces',
              difficulty: String(rating),
              tags: pTags,
              url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
              overlapCount: overlap.length,
              overlapTags: overlap,
              score,
              reason: `Shares ${overlap.slice(0, 3).join(', ')} — similar rating (${rating})`
            });
          });

          candidates.sort((a, b) => b.score - a.score);
          suggestions.push(...candidates.slice(0, 5));
        }
      } catch (cfErr) {
        console.log('[Recommend] CF similar fetch error:', cfErr.message);
      }
    }

    // If fewer than 3 suggestions (or for LeetCode/General), pull from curated problem bank
    if (suggestions.length < 3) {
      const LEETCODE_BANK = [
        { title: 'Two Sum', platform: 'LeetCode', difficulty: 'Easy', tags: ['Array', 'Hash Table'], url: 'https://leetcode.com/problems/two-sum/' },
        { title: '3Sum', platform: 'LeetCode', difficulty: 'Medium', tags: ['Array', 'Two Pointers', 'Sorting'], url: 'https://leetcode.com/problems/3sum/' },
        { title: 'Container With Most Water', platform: 'LeetCode', difficulty: 'Medium', tags: ['Array', 'Two Pointers', 'Greedy'], url: 'https://leetcode.com/problems/container-with-most-water/' },
        { title: 'Best Time to Buy and Sell Stock', platform: 'LeetCode', difficulty: 'Easy', tags: ['Array', 'Dynamic Programming'], url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
        { title: 'Climbing Stairs', platform: 'LeetCode', difficulty: 'Easy', tags: ['Math', 'Dynamic Programming', 'Memoization'], url: 'https://leetcode.com/problems/climbing-stairs/' },
        { title: 'Coin Change', platform: 'LeetCode', difficulty: 'Medium', tags: ['Array', 'Dynamic Programming', 'BFS'], url: 'https://leetcode.com/problems/coin-change/' },
        { title: 'Longest Common Subsequence', platform: 'LeetCode', difficulty: 'Medium', tags: ['String', 'Dynamic Programming'], url: 'https://leetcode.com/problems/longest-common-subsequence/' },
        { title: 'Word Break', platform: 'LeetCode', difficulty: 'Medium', tags: ['Hash Table', 'String', 'Dynamic Programming', 'Trie'], url: 'https://leetcode.com/problems/word-break/' },
        { title: 'Course Schedule', platform: 'LeetCode', difficulty: 'Medium', tags: ['Depth-First Search', 'Breadth-First Search', 'Graph', 'Topological Sort'], url: 'https://leetcode.com/problems/course-schedule/' },
        { title: 'Number of Islands', platform: 'LeetCode', difficulty: 'Medium', tags: ['Array', 'Depth-First Search', 'Breadth-First Search', 'Union Find', 'Matrix'], url: 'https://leetcode.com/problems/number-of-islands/' },
        { title: 'Valid Anagram', platform: 'LeetCode', difficulty: 'Easy', tags: ['Hash Table', 'String', 'Sorting'], url: 'https://leetcode.com/problems/valid-anagram/' },
        { title: 'Group Anagrams', platform: 'LeetCode', difficulty: 'Medium', tags: ['Array', 'Hash Table', 'String', 'Sorting'], url: 'https://leetcode.com/problems/group-anagrams/' }
      ];

      const normTargetTags = targetTags.map(t => t.toLowerCase());

      LEETCODE_BANK.forEach(item => {
        if (solvedTitleSet.has(item.title.toLowerCase())) return;
        if (title && item.title.toLowerCase() === title.toLowerCase()) return;
        if (suggestions.some(s => s.title.toLowerCase() === item.title.toLowerCase())) return;

        const overlap = item.tags.filter(t => normTargetTags.some(nt => nt === t.toLowerCase() || t.toLowerCase().includes(nt) || nt.includes(t.toLowerCase())));
        if (overlap.length > 0 || String(difficulty).toLowerCase() === item.difficulty.toLowerCase()) {
          suggestions.push({
            id: item.url,
            title: item.title,
            platform: item.platform,
            difficulty: item.difficulty,
            tags: item.tags,
            url: item.url,
            overlapCount: overlap.length,
            overlapTags: overlap,
            reason: overlap.length > 0
              ? `Shares ${overlap.join(', ')} — ${item.difficulty} difficulty`
              : `Matches ${item.difficulty} difficulty tier for target practice`
          });
        }
      });
    }

    res.json({
      similar: suggestions.slice(0, 5)
    });

  } catch (err) {
    console.error('getSimilarProblems error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getRecommendations, getSimilarProblems };
