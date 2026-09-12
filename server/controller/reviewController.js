const Problem = require('../models/Problem');

// Get all problems due for review today
exports.getDueReviews = async (req, res) => {
  try {
    const now = new Date();
    const dueProblems = await Problem.find({
      userId: req.user.id,
      archived: { $ne: true },
      'review.enabled': true,
      'review.nextReviewAt': { $lte: now }
    }).sort({ 'review.nextReviewAt': 1 });

    const totalInReview = await Problem.countDocuments({
      userId: req.user.id,
      archived: { $ne: true },
      'review.enabled': true
    });

    res.json({
      dueCount: dueProblems.length,
      totalInReview,
      dueProblems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Enable or disable review for a problem
exports.toggleProblemReview = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { enabled } = req.body;

    const problem = await Problem.findOne({ _id: problemId, userId: req.user.id });
    if (!problem) return res.status(404).json({ msg: 'Problem not found' });

    problem.review = problem.review || {};
    problem.review.enabled = Boolean(enabled);
    if (enabled && !problem.review.nextReviewAt) {
      problem.review.nextReviewAt = new Date(); // due immediately
      problem.review.interval = 1;
      problem.review.easeFactor = 2.5;
      problem.review.repetitions = 0;
    }

    await problem.save();
    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rate a problem review (SM-2 Algorithm)
exports.rateReview = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { rating } = req.body; // 'again', 'hard', 'good', 'easy'

    if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
      return res.status(400).json({ error: 'Rating must be one of: again, hard, good, easy' });
    }

    const problem = await Problem.findOne({ _id: problemId, userId: req.user.id });
    if (!problem) return res.status(404).json({ msg: 'Problem not found' });

    let { interval = 1, easeFactor = 2.5, repetitions = 0 } = problem.review || {};

    // Map rating to SM-2 quality (0 to 5)
    let quality = 4; // default 'good'
    if (rating === 'again') quality = 1;
    if (rating === 'hard') quality = 2.5;
    if (rating === 'good') quality = 4;
    if (rating === 'easy') quality = 5;

    // SM-2 calculation
    if (quality < 3) { // failed recall
      repetitions = 0;
      interval = 1;
    } else { // successful recall
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    }

    // Update ease factor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    // If 'again', force review again in 1 day
    if (rating === 'again') {
      interval = 1;
    }

    const nextReviewAt = new Date(Date.now() + interval * 86400000);

    problem.review = {
      enabled: true,
      nextReviewAt,
      interval,
      easeFactor: Number(easeFactor.toFixed(2)),
      repetitions,
      lastRating: rating
    };

    await problem.save();
    res.json({ message: 'Review rated successfully', review: problem.review, problem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
