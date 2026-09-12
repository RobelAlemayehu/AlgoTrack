require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function cleanCfDuplicatesOnly() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Problem = require('../models/Problem');

    // Delete any problemId matching CF-<number>-<index> (e.g. CF-1197-C)
    const res = await Problem.deleteMany({
      platform: 'Codeforces',
      problemId: { $regex: /^CF-\d+-[A-Z0-9]+$/ }
    });

    console.log(`Deleted ${res.deletedCount} hyphenated Codeforces duplicate documents.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

cleanCfDuplicatesOnly();
