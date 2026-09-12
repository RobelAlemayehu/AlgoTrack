const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getWeakTopicDrill, completeDrillProblem, getDrillStats } = require('../controller/drillController');

router.get('/weak-topics', auth, getWeakTopicDrill);
router.post('/complete', auth, completeDrillProblem);
router.get('/stats', auth, getDrillStats);

module.exports = router;
