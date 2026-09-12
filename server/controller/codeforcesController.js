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

    // Fetch submissions — incremental if lastSync.codeforces exists and forceFull is false
    const lastSyncDate = (!forceFull && user.lastSync?.codeforces) ? new Date(user.lastSync.codeforces) : null;
    let submissions = [];

    try {
      const fetchCount = lastSyncDate ? 500 : 100000;
      const subRes = await axios.get(
        `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=${fetchCount}`,
        { timeout: 20000 }
      );
      if (subRes.data.status !== 'OK') throw new Error(subRes.data.comment || 'CF API error');
      submissions = subRes.data.result || [];

      if (lastSyncDate) {
        const lastTs = Math.floor(lastSyncDate.getTime() / 1000);
        submissions = submissions.filter(s => s.creationTimeSeconds > lastTs);
      }
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
    console.log(`[CF] Sync for ${handle}: ${submissions.length} new submissions, ${finalData.length} unique AC problems (incremental: ${Boolean(lastSyncDate)})`);

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
    const user = await User.findById(req.user.id).select('lcCalendar');
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