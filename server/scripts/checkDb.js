require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Problem = require('../models/Problem');
    const User = require('../models/User');

    const users = await User.find({});
    for (const u of users) {
      console.log(`User: ${u.username} (${u._id})`);
      console.log(`  Handles: LC=${u.handles?.leetcode}, CF=${u.handles?.codeforces}`);
      console.log(`  lcStats:`, u.lcStats);

      const allProbs = await Problem.find({ userId: u._id });
      const activeProbs = allProbs.filter(p => !p.archived);

      console.log(`  Total stored problems in DB: ${allProbs.length} (Active: ${activeProbs.length})`);

      const lcProbs = activeProbs.filter(p => p.platform === 'LeetCode');
      const cfProbs = activeProbs.filter(p => p.platform === 'Codeforces');

      console.log(`  LeetCode active count: ${lcProbs.length}`);
      console.log(`  Codeforces active count: ${cfProbs.length}`);

      if (cfProbs.length > 0) {
        console.log(`  Sample CF problemIds:`, cfProbs.slice(0, 5).map(p => p.problemId));
      }
      if (lcProbs.length > 0) {
        console.log(`  Sample LC problemIds:`, lcProbs.slice(0, 5).map(p => p.problemId));
      }
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkDb();
