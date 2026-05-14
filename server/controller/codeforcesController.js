const axios = require('axios');
const Problem = require('../models/Problem.js');
const User = require('../models/User');

// ── Fetch ALL accepted submissions (no hard limit from CF API) ───────────────
const syncCodeforces = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ msg: 'User not found' });
    const handle = req.query.handle || user.handles?.codeforces;

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

    // Fetch ALL submissions — CF API returns all of them without a hard cap
    // count=100000 ensures we get everything (most users have < 10k submissions)
    let submissions;
    try {
      const subRes = await axios.get(
        `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100000`,
        { timeout: 20000 }
      );
      if (subRes.data.status !== 'OK') throw new Error(subRes.data.comment || 'CF API error');
      submissions = subRes.data.result;
    } catch (err) {
      return res.status(502).json({ error: `Codeforces API error: ${err.message}` });
    }

    // ── Update CF profile on User ─────────────────────────────────────────────
    await User.findByIdAndUpdate(req.user.id, { cfRating, cfMaxRating, cfRank });

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
          tags: sub.problem.tags || [],   // ← extract tags from CF submission
          syncedAt: new Date(sub.creationTimeSeconds * 1000)
        });
      }
    });

    const finalData = [...uniqueSolved.values()];
    console.log(`[CF] Found ${submissions.length} total submissions, ${finalData.length} unique AC problems for ${handle}`);

    if (finalData.length === 0) {
      return res.json({ message: 'No accepted Codeforces submissions found.', count: 0 });
    }

    // ── Bulk upsert ────────────────────────────────────────────────────────────
    const ops = finalData.map(prob => ({
      updateOne: {
        filter: { problemId: prob.problemId, userId: req.user.id },
        update: { $set: prob },
        upsert: true
      }
    }));

    await Problem.bulkWrite(ops);

    res.json({
      message: 'Codeforces synced!',
      count: finalData.length,
      cfRating,
      cfMaxRating,
      cfRank
    });

  } catch (error) {
    console.error('CF Sync Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ── Get all stored problems for this user ─────────────────────────────────────
const getProblems = async (req, res) => {
  try {
    const problems = await Problem.find({ userId: req.user.id }).sort({ syncedAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch problems', error: error.message });
  }
};

module.exports = { syncCodeforces, getProblems };