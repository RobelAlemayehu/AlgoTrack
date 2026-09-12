const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

const { syncCodeforces, getProblems } = require('../controller/codeforcesController');
const { syncLeetCode }                 = require('../controller/leetCodeController');
const { resetProblems, getArchivedProblems, restoreArchivedProblems, exportProblemData, addManualProblem } = require('../controller/problemController');
const { compareUsers }                 = require('../controller/compareController');
const { getRecommendations }           = require('../controller/recommendController');
const { getUpcomingContests }          = require('../controller/contestController');
const { getUserBadges, markBadgesSeen } = require('../controller/badgeController');

const Problem = require('../models/Problem');
const User = require('../models/User');
const { calculateStreak } = require('../utils/streak');

router.get('/codeforces', auth, syncCodeforces);
router.post('/leetcode',  auth, syncLeetCode);
router.post('/manual',    auth, addManualProblem);
router.get('/all',        auth, getProblems);
router.get('/streak',     auth, async (req, res) => {
  try {
    const problems = await Problem.find({ userId: req.user.id, archived: { $ne: true } });
    const user = await User.findById(req.user.id).select('lcCalendar');
    const tzOffset = req.query.tzOffset !== undefined ? parseInt(req.query.tzOffset) : 0;
    const streak = calculateStreak(problems, user?.lcCalendar || {}, tzOffset);
    res.json({ streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/reset',   auth, resetProblems);
router.get('/compare',    auth, compareUsers);
router.get('/recommend',  auth, getRecommendations);
router.get('/contests',   auth, getUpcomingContests);
router.get('/badges',     auth, getUserBadges);
router.put('/badges/seen',auth, markBadgesSeen);
router.get('/export',     auth, exportProblemData);
router.get('/archived',   auth, getArchivedProblems);
router.post('/restore',   auth, restoreArchivedProblems);

// Debug: see exactly what LC API returns for a given username
router.get('/lc-debug', auth, async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'pass ?username=yourhandle' });
  try {
    const r = await axios.post('https://leetcode.com/graphql', {
      query: `query($u:String!){recentAcSubmissionList(username:$u,limit:15){id title titleSlug timestamp}}`,
      variables: { u: username }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'Origin': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 15000
    });
    res.json({ status: r.status, data: r.data });
  } catch (err) {
    res.status(500).json({ error: err.message, response: err.response?.data });
  }
});

module.exports = router;