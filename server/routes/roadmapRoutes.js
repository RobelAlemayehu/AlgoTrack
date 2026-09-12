const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getRoadmaps, getRoadmapBySlug, toggleInProgress } = require('../controller/roadmapController');

router.get('/', auth, getRoadmaps);
router.get('/:slug', auth, getRoadmapBySlug);
router.post('/:slug/toggle-progress', auth, toggleInProgress);

module.exports = router;
