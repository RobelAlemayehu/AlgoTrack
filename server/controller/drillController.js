const axios = require('axios');
const Problem = require('../models/Problem');
const User = require('../models/User');
const UserDrill = require('../models/UserDrill');

// Popular offline CF problem bank per tag for fast fallback
const TAG_FALLBACK_PROBLEMS = {
  'dp': [
    { title: 'Boredom', problemId: 'CF-455A', difficulty: '1500', platform: 'Codeforces', tags: ['dp'], url: 'https://codeforces.com/problemset/problem/455/A' },
    { title: 'Cut Ribbon', problemId: 'CF-189A', difficulty: '1300', platform: 'Codeforces', tags: ['dp'], url: 'https://codeforces.com/problemset/problem/189/A' },
    { title: 'K-Complete Word', problemId: 'CF-1332C', difficulty: '1500', platform: 'Codeforces', tags: ['dp'], url: 'https://codeforces.com/problemset/problem/1332/C' },
    { title: 'Maximum Sum', problemId: 'CF-1832B', difficulty: '1100', platform: 'Codeforces', tags: ['dp'], url: 'https://codeforces.com/problemset/problem/1832/B' }
  ],
  'graphs': [
    { title: 'News Distribution', problemId: 'CF-1167C', difficulty: '1300', platform: 'Codeforces', tags: ['graphs', 'dsu'], url: 'https://codeforces.com/problemset/problem/1167/C' },
    { title: 'Badge', problemId: 'CF-1020B', difficulty: '1000', platform: 'Codeforces', tags: ['graphs', 'dfs'], url: 'https://codeforces.com/problemset/problem/1020/B' },
    { title: 'K-Tree', problemId: 'CF-431C', difficulty: '1400', platform: 'Codeforces', tags: ['graphs', 'dp'], url: 'https://codeforces.com/problemset/problem/431/C' }
  ],
  'binary search': [
    { title: 'Poisoned Dagger', problemId: 'CF-1613C', difficulty: '1200', platform: 'Codeforces', tags: ['binary search'], url: 'https://codeforces.com/problemset/problem/1613/C' },
    { title: 'Worms', problemId: 'CF-474B', difficulty: '1200', platform: 'Codeforces', tags: ['binary search'], url: 'https://codeforces.com/problemset/problem/474/B' },
    { title: 'Interesting Drink', problemId: 'CF-706B', difficulty: '1100', platform: 'Codeforces', tags: ['binary search'], url: 'https://codeforces.com/problemset/problem/706/B' }
  ],
  'trees': [
    { title: 'K-Tree', problemId: 'CF-431C', difficulty: '1400', platform: 'Codeforces', tags: ['trees', 'dp'], url: 'https://codeforces.com/problemset/problem/431/C' },
    { title: 'Queen', problemId: 'CF-1144D', difficulty: '1400', platform: 'Codeforces', tags: ['trees'], url: 'https://codeforces.com/problemset/problem/1144/D' }
  ],
  'two pointers': [
    { title: 'Books', problemId: 'CF-279B', difficulty: '1400', platform: 'Codeforces', tags: ['two pointers'], url: 'https://codeforces.com/problemset/problem/279/B' },
    { title: 'Sereja and Dima', problemId: 'CF-381A', difficulty: '800', platform: 'Codeforces', tags: ['two pointers'], url: 'https://codeforces.com/problemset/problem/381/A' },
    { title: 'Pair of Topics', problemId: 'CF-1324D', difficulty: '1400', platform: 'Codeforces', tags: ['two pointers', 'binary search'], url: 'https://codeforces.com/problemset/problem/1324/D' }
  ],
  'math': [
    { title: 'Required Remainder', problemId: 'CF-1374A', difficulty: '800', platform: 'Codeforces', tags: ['math'], url: 'https://codeforces.com/problemset/problem/1374/A' },
    { title: 'Minimal Square', problemId: 'CF-1360A', difficulty: '800', platform: 'Codeforces', tags: ['math'], url: 'https://codeforces.com/problemset/problem/1360/A' },
    { title: 'Honest Coach', problemId: 'CF-1360B', difficulty: '800', platform: 'Codeforces', tags: ['math', 'sortings'], url: 'https://codeforces.com/problemset/problem/1360/B' }
  ],
  'greedy': [
    { title: 'Construct the String', problemId: 'CF-1335B', difficulty: '1000', platform: 'Codeforces', tags: ['greedy'], url: 'https://codeforces.com/problemset/problem/1335/B' },
    { title: 'Candies and Two Sisters', problemId: 'CF-1335A', difficulty: '800', platform: 'Codeforces', tags: ['greedy', 'math'], url: 'https://codeforces.com/problemset/problem/1335/A' },
    { title: 'Restoring Three Numbers', problemId: 'CF-1154A', difficulty: '800', platform: 'Codeforces', tags: ['greedy', 'math'], url: 'https://codeforces.com/problemset/problem/1154/A' }
  ]
};

// GET /api/drills/weak-topics - Compute top 3 weakest tags & return curated drill set
const getWeakTopicDrill = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const userProblems = await Problem.find({
      userId: req.user.id,
      archived: { $ne: true }
    });

    // Low data threshold (fewer than 5 problems total)
    if (userProblems.length < 5) {
      return res.json({
        hasEnoughData: false,
        totalProblemsSynced: userProblems.length,
        minRequired: 5,
        message: 'Solve at least 5 problems across different topics to unlock your personalized Weak-Topic Drills.',
        weakTags: [],
        drillProblems: []
      });
    }

    const solvedSet = new Set(userProblems.map(p => (p.problemId || '').toLowerCase().trim()));

    // Tag counts calculation
    const tagStats = {}; // tag -> { solved, total }
    userProblems.forEach(p => {
      const isSolved = p.solvedAt || (p.status === 'Solved') || !p.unverified;
      (p.tags || []).forEach(rawTag => {
        const tag = rawTag.toLowerCase().trim();
        // Exclude generic meta-tags
        if (['implementation', 'brute force', 'constructive algorithms', 'special'].includes(tag) || tag.startsWith('*')) return;
        if (!tagStats[tag]) tagStats[tag] = { tag: rawTag, solved: 0, total: 0 };
        tagStats[tag].total += 1;
        if (isSolved) tagStats[tag].solved += 1;
      });
    });

    const tagEntries = Object.values(tagStats);
    if (tagEntries.length === 0) {
      return res.json({
        hasEnoughData: false,
        totalProblemsSynced: userProblems.length,
        minRequired: 5,
        message: 'Not enough topic tag variance available yet. Keep practicing!',
        weakTags: [],
        drillProblems: []
      });
    }

    // Normalized weakness score formula:
    // W = (Attempted - Solved) * (1.5 - (Solved / Attempted)) + (10 / (Solved + 1))
    const scoredTags = tagEntries.map(t => {
      const rate = t.solved / (t.total || 1);
      const unsolved = t.total - t.solved;
      const weaknessScore = (unsolved * 2.0) + ((1.0 - rate) * 8.0) + (10.0 / (t.solved + 1));
      return {
        ...t,
        rate,
        unsolved,
        weaknessScore
      };
    });

    scoredTags.sort((a, b) => b.weaknessScore - a.weaknessScore);
    const top3Weak = scoredTags.slice(0, 3);

    // Build human-readable reasoning strings
    const weakTagsWithReason = top3Weak.map(wt => {
      const pct = Math.round(wt.rate * 100);
      let reason = '';
      if (wt.solved === 0) {
        reason = `${wt.tag}: 0 solved out of ${wt.total} attempted — 0% completion rate`;
      } else {
        reason = `${wt.tag}: ${wt.solved} solved out of ${wt.total} attempted — ${pct}% completion rate (${wt.unsolved} unpracticed)`;
      }
      return {
        tag: wt.tag,
        solved: wt.solved,
        total: wt.total,
        ratePercent: pct,
        reason
      };
    });

    // Fetch completed drills by user to exclude them as well
    const completedDrills = await UserDrill.find({ userId: req.user.id });
    const completedDrillSet = new Set(completedDrills.map(d => (d.problemId || '').toLowerCase().trim()));

    // Combined exclusion set (already solved in ledger OR completed in drills)
    const excludedSet = new Set([...solvedSet, ...completedDrillSet]);

    // Fetch practice problems for weak tags
    const targetRating = user?.cfRating ? Math.max(800, user.cfRating + 100) : 1000;
    const drillProblems = [];

    // Helper shuffle function (Fisher-Yates)
    const shuffleArray = (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    for (const wt of weakTagsWithReason) {
      const tagLower = wt.tag.toLowerCase();
      let candidates = [];

      // Attempt Codeforces API live fetch for tag
      try {
        const cfRes = await axios.get(`https://codeforces.com/api/problemset.problems?tags=${encodeURIComponent(tagLower)}`, { timeout: 6000 });
        if (cfRes.data?.status === 'OK') {
          const apiProbs = cfRes.data.result?.problems || [];
          candidates = apiProbs
            .filter(p => p.rating && p.rating >= targetRating - 300 && p.rating <= targetRating + 400 && p.contestId)
            .map(p => {
              const pId = `CF-${p.contestId}${p.index}`;
              return {
                problemId: pId,
                title: p.name,
                platform: 'Codeforces',
                difficulty: p.rating.toString(),
                tags: p.tags || [wt.tag],
                url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
                weakTag: wt.tag
              };
            });
        }
      } catch (err) {
        // Fallback to offline bank
      }

      if (candidates.length === 0) {
        const fallback = TAG_FALLBACK_PROBLEMS[tagLower] || TAG_FALLBACK_PROBLEMS['greedy'];
        candidates = fallback.map(p => ({ ...p, weakTag: wt.tag }));
      }

      // Filter out already solved/completed problems
      const unsolvedCandidates = candidates.filter(p => !excludedSet.has(p.problemId.toLowerCase().trim()));
      const poolToUse = unsolvedCandidates.length > 0 ? unsolvedCandidates : candidates;

      // Shuffle pool and select 2 distinct problems per weak tag
      const shuffled = shuffleArray(poolToUse);
      const selected = shuffled.slice(0, 2);

      drillProblems.push(...selected);
    }

    res.json({
      hasEnoughData: true,
      totalProblemsSynced: userProblems.length,
      weakTags: weakTagsWithReason,
      drillProblems
    });

  } catch (err) {
    console.error('getWeakTopicDrill Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/drills/complete - Record completed drill
const completeDrillProblem = async (req, res) => {
  try {
    const { problemId, title, platform, tag, difficulty } = req.body;
    if (!problemId || !tag) {
      return res.status(400).json({ error: 'problemId and tag are required' });
    }

    const drill = new UserDrill({
      userId: req.user.id,
      problemId,
      title: title || problemId,
      platform: platform || 'Codeforces',
      tag,
      difficulty: difficulty || 'Medium',
      completedAt: new Date()
    });

    await drill.save();

    res.json({ message: 'Drill completed!', drill });
  } catch (err) {
    console.error('completeDrillProblem Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/drills/stats - Get weekly drill completion stat
const getDrillStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const countThisWeek = await UserDrill.countDocuments({
      userId: req.user.id,
      completedAt: { $gte: sevenDaysAgo }
    });

    const totalDrillsCompleted = await UserDrill.countDocuments({
      userId: req.user.id
    });

    res.json({
      drillsCompletedThisWeek: countThisWeek,
      totalDrillsCompleted
    });
  } catch (err) {
    console.error('getDrillStats Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getWeakTopicDrill, completeDrillProblem, getDrillStats };
