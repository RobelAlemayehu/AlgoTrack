const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const User = require('../server/models/User');
const Problem = require('../server/models/Problem');
const Group = require('../server/models/Group');
const UserRoadmapProgress = require('../server/models/UserRoadmapProgress');
const Roadmap = require('../server/models/Roadmap');

async function runSweep() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/algotrack');
  console.log('Connected to MongoDB');

  const users = await User.find();
  console.log(`Found ${users.length} users in DB:`);
  for (const u of users) {
    const problems = await Problem.find({ userId: u._id, archived: { $ne: true } });
    const lcProblems = problems.filter(p => p.platform === 'LeetCode');
    const cfProblems = problems.filter(p => p.platform === 'Codeforces');
    const otherProblems = problems.filter(p => p.platform !== 'LeetCode' && p.platform !== 'Codeforces');

    console.log(`User: ${u.username} (${u._id})`);
    console.log(`  Handles: LC: @${u.handles?.leetcode}, CF: @${u.handles?.codeforces}`);
    console.log(`  DB Problem Count: Total=${problems.length}, LC=${lcProblems.length}, CF=${cfProblems.length}, Other=${otherProblems.length}`);
    console.log(`  User.lcStats.total: ${u.lcStats?.total}`);
  }

  await mongoose.disconnect();
}

runSweep().catch(console.error);
