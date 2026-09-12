const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDueReviews, toggleProblemReview, rateReview } = require('../controller/reviewController');

router.get('/due', auth, getDueReviews);
router.put('/:problemId/toggle', auth, toggleProblemReview);
router.post('/:problemId/rate', auth, rateReview);

module.exports = router;
