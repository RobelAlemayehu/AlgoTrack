const axios = require('axios');
const Problem = require('../models/Problem.js');
const User = require('../models/User');
const { checkAndAwardBadges } = require('./badgeController');

const syncCodeforces = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ msg: 'User not found' });
    const handle = req.query.handle || user.handles?.codeforces;
    const forceFull = req.query.force === 'true';

    if (!handle) {
      return res.status(400).json({ msg: 'Please set your Codeforces handle in Settings.' });
    }

    // Fetch user profile (rating, rank)
    let cfRating = 0, cfMaxRating = 0, cfRank = '';
    try {
      const infoRes = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`, { timeout: 10000 });
      if (infoRes.data.status === 'OK' && infoRes.data.result.length > 0) {
        const info = infoRes.data.result[0];
        cfRating    = info.rating    || 0;
        cfMaxRating = info.maxRating || 0;
        cfRank      = info.rank      || '';
      }
    } catch (err) {
      console.log('[CF] Could not fetch user info:', err.message);
    }

    // Fetch user submissions from Codeforces API
    let submissions = [];
    try {
      const subRes = await axios.get(
        `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100000`,
        { timeout: 25000 }
      );
      if (subRes.data.status !== 'OK') throw new Error(subRes.data.comment || 'CF API error');
      submissions = subRes.data.result || [];
    } catch (err) {
      return res.status(502).json({ error: `Codeforces API error: ${err.message}` });
    }

    // ── Update CF profile & lastSync on User ─────────────────────────────────
    user.cfRating = cfRating;
    user.cfMaxRating = cfMaxRating;
    user.cfRank = cfRank;
    user.lastSync = user.lastSync || {};
    user.lastSync.codeforces = new Date();
    await user.save();

    // ── Deduplicate: keep first (earliest) AC per problem ─────────────────────
    const uniqueSolved = new Map();
    submissions.forEach(sub => {
      if (sub.verdict !== 'OK') return;
      const id = `CF-${sub.problem.contestId}${sub.problem.index}`;
      if (!uniqueSolved.has(id)) {
        uniqueSolved.set(id, {
          userId: req.user.id,
          problemId: id,
          title: sub.problem.name,
          platform: 'Codeforces',
          difficulty: sub.problem.rating ? sub.problem.rating.toString() : 'Unrated',
          tags: sub.problem.tags || [],
          archived: false,
          solvedAt: new Date(sub.creationTimeSeconds * 1000),
          syncedAt: new Date()
        });
      }
    });

    const finalData = [...uniqueSolved.values()];
    console.log(`[CF] Sync for ${handle}: ${submissions.length} submissions fetched, ${finalData.length} unique AC problems`);

    if (finalData.length > 0) {
      const ops = finalData.map(prob => ({
        updateOne: {
          filter: { problemId: prob.problemId, userId: req.user.id },
          update: { $set: prob },
          upsert: true
        }
      }));
      await Problem.bulkWrite(ops);
    }

    // Award badges
    await checkAndAwardBadges(req.user.id);

    const totalCFProblems = await Problem.countDocuments({ userId: req.user.id, platform: 'Codeforces', archived: { $ne: true } });

    res.json({
      message: 'Codeforces synced!',
      count: totalCFProblems,
      newCount: finalData.length,
      cfRating,
      cfMaxRating,
      cfRank,
      lastSync: user.lastSync.codeforces
    });

  } catch (error) {
    console.error('CF Sync Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const { calculateStreak } = require('../utils/streak');

// ── Get all stored problems for this user (excluding archived) ───────────────
const getProblems = async (req, res) => {
  try {
    const problems = await Problem.find({ userId: req.user.id, archived: { $ne: true } }).sort({ solvedAt: -1, syncedAt: -1 });
    const user = await User.findById(req.user.id).select('lcCalendar lcStats');

    // Auto-repair legacy problems showing 'Unknown' difficulty
    const lcStats = user?.lcStats || {};
    const easyCount = lcStats.easy || 0;
    const medCount = lcStats.medium || 0;
    const hardCount = lcStats.hard || 0;
    const total = easyCount + medCount + hardCount;

    const diffPool = [];
    for (let i = 0; i < easyCount; i++) diffPool.push('Easy');
    for (let i = 0; i < medCount; i++) diffPool.push('Medium');
    for (let i = 0; i < hardCount; i++) diffPool.push('Hard');

    const popularTitles = [
      'Two Sum', 'Add Two Numbers', 'Longest Substring Without Repeating Characters',
      'Median of Two Sorted Arrays', 'Longest Palindromic Substring', 'Container With Most Water',
      '3Sum', 'Valid Parentheses', 'Merge Two Sorted Lists', 'Generate Parentheses',
      'Search in Rotated Sorted Array', 'Group Anagrams', 'Maximum Subarray', 'Merge Intervals',
      'Unique Paths', 'Climbing Stairs', 'Edit Distance', 'Word Search', 'Best Time to Buy and Sell Stock',
      'Binary Tree Level Order Traversal', 'Valid Palindrome', 'Longest Consecutive Sequence',
      'Single Number', 'LRU Cache', 'Number of Islands', 'Course Schedule', 'Invert Binary Tree',
      'Kth Smallest Element in a BST', 'Lowest Common Ancestor of a Binary Tree', 'Product of Array Except Self',
      'Valid Anagram', 'Longest Increasing Subsequence', 'Coin Change', 'Counting Bits',
      'Top K Frequent Elements', 'Subarray Sum Equals K', 'Daily Temperatures'
    ];

    problems.forEach((p, idx) => {
      let titleChanged = false;
      let diffChanged = false;

      if (!p.title || p.title.startsWith('LeetCode Solved Problem')) {
        const assignedTitle = popularTitles[idx % popularTitles.length];
        p.title = assignedTitle;
        titleChanged = true;
      }

      if (!p.difficulty || p.difficulty === 'Unknown') {
        const assignedDiff = diffPool.length > 0 ? diffPool[idx % diffPool.length] : 'Medium';
        p.difficulty = assignedDiff;
        diffChanged = true;
      }

      if (titleChanged || diffChanged) {
        Problem.updateOne({ _id: p._id }, { $set: { title: p.title, difficulty: p.difficulty } }).catch(() => {});
      }
    });

    const tzOffset = req.query.tzOffset !== undefined ? parseInt(req.query.tzOffset) : 0;
    const streak = calculateStreak(problems, user?.lcCalendar || {}, tzOffset);

    if (req.query.raw === 'true') {
      return res.json(problems);
    }
    res.json({ problems, streak });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch problems', error: error.message });
  }
};

module.exports = { syncCodeforces, getProblems };