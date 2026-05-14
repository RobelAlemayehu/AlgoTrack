const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const { syncCodeforces, getProblems } = require('../controller/codeforcesController');
const { syncLeetCode }                 = require('../controller/leetCodeController');
const { resetProblems }                = require('../controller/problemController');
const { compareUsers }                 = require('../controller/compareController');
const { getRecommendations }           = require('../controller/recommendController');

router.get('/codeforces', auth, syncCodeforces);
router.post('/leetcode',  auth, syncLeetCode);
router.get('/all',        auth, getProblems);
router.delete('/reset',   auth, resetProblems);
router.get('/compare',    auth, compareUsers);
router.get('/recommend',  auth, getRecommendations);

module.exports = router;