require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('../models/User');
  const Problem = require('../models/Problem');
  const Roadmap = require('../models/Roadmap');

  const user = await User.findOne({ username: 'rovel_19' });
  const roadmap = await Roadmap.findOne({ slug: 'blind-75' });
  const userProblems = await Problem.find({ userId: user._id, archived: { $ne: true } });

  console.log(`\n=== REAL DATA VERIFICATION FOR USER: ${user.username} ===`);
  console.log(`Total Synced Problems in DB: ${userProblems.length}`);

  // Feature 1 Verification: Roadmap Stable Matching
  const solvedSet = new Set(userProblems.map(p => (p.problemId || '').toLowerCase().trim()));
  let solvedBlind75 = 0;
  roadmap.problems.forEach(p => {
    if (solvedSet.has((p.problemId || '').toLowerCase().trim())) {
      solvedBlind75++;
    }
  });

  console.log(`\n--- FEATURE 1: BLIND 75 ROADMAP ---`);
  console.log(`Roadmap Title: ${roadmap.title} (${roadmap.problems.length} total problems)`);
  console.log(`Matched Solved Problems: ${solvedBlind75} / ${roadmap.problems.length} (${Math.round((solvedBlind75 / roadmap.problems.length) * 100)}%)`);

  // Feature 2 Verification: Weak-Topic Drill Diagnosis
  const tagStats = {};
  userProblems.forEach(p => {
    const isSolved = p.solvedAt || (p.status === 'Solved') || !p.unverified;
    (p.tags || []).forEach(rawTag => {
      const tag = rawTag.toLowerCase().trim();
      if (['implementation', 'brute force', 'constructive algorithms', 'special'].includes(tag) || tag.startsWith('*')) return;
      if (!tagStats[tag]) tagStats[tag] = { tag: rawTag, solved: 0, total: 0 };
      tagStats[tag].total += 1;
      if (isSolved) tagStats[tag].solved += 1;
    });
  });

  const scoredTags = Object.values(tagStats).map(t => {
    const rate = t.solved / (t.total || 1);
    const unsolved = t.total - t.solved;
    const weaknessScore = (unsolved * 2.0) + ((1.0 - rate) * 8.0) + (10.0 / (t.solved + 1));
    return { ...t, rate, unsolved, weaknessScore };
  });

  scoredTags.sort((a, b) => b.weaknessScore - a.weaknessScore);
  const top3Weak = scoredTags.slice(0, 3);

  console.log(`\n--- FEATURE 2: WEAK-TOPIC DRILL DIAGNOSIS ---`);
  top3Weak.forEach((wt, i) => {
    const pct = Math.round(wt.rate * 100);
    console.log(`#${i + 1} Weak Tag: "${wt.tag}" — ${wt.solved} solved / ${wt.total} total (${pct}%, ${wt.unsolved} unpracticed) | Score: ${wt.weaknessScore.toFixed(2)}`);
  });

  await mongoose.disconnect();
}

test();
