const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getRecommendations, getSimilarProblems } = require('../controller/recommendController');

router.get('/', auth, getRecommendations);
router.post('/similar', auth, getSimilarProblems);

module.exports = router;
