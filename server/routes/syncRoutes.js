const express = require('express');
const router = express.Router();

const { syncCodeforces,getProblems } = require('../controller/codeforcesController');
const { syncLeetCode } = require('../controller/leetCodeController');


router.get('/codeforces', syncCodeforces);
router.get('/leetcode', syncLeetCode);
router.get('/all', getProblems)


module.exports = router;