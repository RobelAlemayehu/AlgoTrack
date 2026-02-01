const express = require('express');
const router = express.Router();

const { syncCodeforces, getProblems } = require('../controller/codeforcesController');
const { syncLeetCode } = require('../controller/leetCodeController');
const auth = require('../middleware/auth')


router.get('/codeforces', auth, syncCodeforces);
router.post('/leetcode', auth, syncLeetCode);
router.get('/all', auth, getProblems)


module.exports = router;