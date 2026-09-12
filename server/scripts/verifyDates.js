require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Problem = require('../models/Problem');
  const User = require('../models/User');

  const user = await User.findOne({ username: 'rovel_19' });
  const recent = await Problem.find({ userId: user._id, archived: { $ne: true } })
    .sort({ solvedAt: -1 })
    .limit(15);

  console.log('--- TOP 15 RECENTLY SOLVED PROBLEMS IN ALGOTRACK ---');
  recent.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.platform}] "${p.title}" (${p.difficulty}) - solvedAt: ${p.solvedAt ? p.solvedAt.toISOString() : 'NULL'}`);
  });

  const lcCount = await Problem.countDocuments({ userId: user._id, platform: 'LeetCode', archived: { $ne: true } });
  const cfCount = await Problem.countDocuments({ userId: user._id, platform: 'Codeforces', archived: { $ne: true } });
  console.log(`\nCounts: LeetCode=${lcCount}, Codeforces=${cfCount}, Total=${lcCount + cfCount}`);

  await mongoose.disconnect();
}

verify();
