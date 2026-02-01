const express = require('express');
const router = express.Router();

const { syncCodeforces,getProblems } = require('../controller/codeforcesController');
const { syncLeetCode } = require('../controller/leetCodeController');
const auth = require('../middleware/auth')


router.get('/codeforces', syncCodeforces);
router.post('/leetcode',auth, syncLeetCode);
router.get('/all', getProblems)


module.exports = router;