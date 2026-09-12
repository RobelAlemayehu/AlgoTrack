const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const Problem = require('../server/models/Problem');

async function testCfLc() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- CHECKING CODEFORCES & LEETCODE ---');

  // Check Codeforces API match logic
  const cfApiRes = await fetch('https://codeforces.com/api/problemset.problems');
  if (cfApiRes.ok) {
    const cfData = await cfApiRes.json();
    const cfMap = new Map();
    cfData.result.problems.forEach(p => {
      cfMap.set(`${p.contestId}-${p.index}`, p);
    });

    const cfDbProblems = await Problem.find({ platform: 'Codeforces' }).limit(5);
    for (const p of cfDbProblems) {
      const match = p.problemId.match(/^CF-(\d+)([A-Z0-9]+)$/);
      let key = p.problemId.replace('CF-', '');
      if (match) {
        key = `${match[1]}-${match[2]}`;
      }
      const realP = cfMap.get(key);
      console.log(`DB CF ID: ${p.problemId} -> Key: ${key}`);
      if (realP) {
        const titleMatch = realP.name.toLowerCase() === p.title.toLowerCase();
        const ratingMatch = String(realP.rating) === String(p.difficulty);
        console.log(`  Real CF: Name="${realP.name}", Rating=${realP.rating}, Tags=[${realP.tags.join(', ')}]`);
        console.log(`  Title Match: ${titleMatch}, Rating Match: ${ratingMatch}`);
      } else {
        console.log(`  NOT FOUND FOR KEY: ${key}`);
      }
    }
  }

  await mongoose.disconnect();
}

testCfLc().catch(console.error);
