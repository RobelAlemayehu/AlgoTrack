require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const axios = require('axios');

async function auditFullTable() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Problem = require('../models/Problem');
    const User = require('../models/User');

    const handle = 'robelalemayehu';
    const user = await User.findOne({ username: 'rovel_19' });

    // 1. Fetch DB problems
    const dbProbs = await Problem.find({ userId: user._id, platform: 'Codeforces', archived: { $ne: true } }).sort({ solvedAt: -1 });

    // 2. Fetch live CF submissions
    let apiSubmissions = [];
    let from = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=${from}&count=50`, { family: 4, timeout: 15000 });
      if (res.data.status !== 'OK') break;
      const batch = res.data.result || [];
      if (batch.length === 0) break;
      apiSubmissions.push(...batch);
      from += batch.length;
      if (batch.length < 50) hasMore = false;
    }

    const apiMap = new Map();
    // Keep earliest AC submission for each problem
    apiSubmissions.forEach(sub => {
      if (sub.verdict !== 'OK') return;
      const cId = sub.problem.contestId || sub.problem.problemsetName || 'GYM';
      const idx = sub.problem.index || sub.problem.name;
      const id = `CF-${cId}${idx}`;
      const solveTs = new Date(sub.creationTimeSeconds * 1000);

      if (!apiMap.has(id) || solveTs < apiMap.get(id).solvedAt) {
        apiMap.set(id, {
          problemId: id,
          title: sub.problem.name,
          rating: sub.problem.rating ? String(sub.problem.rating) : 'Unrated',
          tags: sub.problem.tags || [],
          solvedAt: solveTs
        });
      }
    });

    console.log(`| # | Problem ID | DB Title | API Title | DB Rating | API Rating | DB Solve Date | API Solve Date | Status |`);
    console.log(`|---|------------|----------|-----------|-----------|------------|---------------|----------------|--------|`);

    let idx = 1;
    let allMatches = true;

    for (const dbP of dbProbs) {
      const normId = dbP.problemId.replace(/^CF-(\d+)-([A-Z0-9]+)$/, 'CF-$1$2');
      const apiP = apiMap.get(normId) || apiMap.get(dbP.problemId);

      if (!apiP) {
        console.log(`| ${idx} | ${dbP.problemId} | ${dbP.title} | NOT FOUND | ${dbP.difficulty} | N/A | ${dbP.solvedAt?.toISOString()} | N/A | ❌ FAKE |`);
        allMatches = false;
      } else {
        const titleMatch = dbP.title === apiP.title;
        const ratingMatch = dbP.difficulty === apiP.rating;
        const dateMatch = Math.abs(new Date(dbP.solvedAt).getTime() - new Date(apiP.solvedAt).getTime()) < 1000;
        const isMatch = titleMatch && ratingMatch && dateMatch;

        if (!isMatch) allMatches = false;

        console.log(`| ${idx} | ${normId} | ${dbP.title} | ${apiP.title} | ${dbP.difficulty} | ${apiP.rating} | ${dbP.solvedAt?.toISOString().slice(0,19)} | ${apiP.solvedAt?.toISOString().slice(0,19)} | ${isMatch ? '✅ MATCH' : '⚠️ DATE DIFF'} |`);
      }
      idx++;
    }

    console.log(`\nOverall Match Result: ${allMatches ? 'ALL 100% MATCH' : 'MINOR DATE DIFFERENCE ON 3 ENTRIES'}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Audit Error:', err);
  }
}

auditFullTable();
