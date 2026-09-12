// Input validation helper functions for server routes

exports.validateAuthInput = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid or missing email address' });
  }
  if (!password || typeof password !== 'string' || password.length < 5) {
    return res.status(400).json({ error: 'Password must be at least 5 characters long' });
  }
  next();
};

exports.validateRegisterInput = (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters long' });
  }
  exports.validateAuthInput(req, res, next);
};

exports.validateReviewRating = (req, res, next) => {
  const { rating } = req.body;
  const validRatings = ['again', 'hard', 'good', 'easy'];
  if (!rating || !validRatings.includes(rating)) {
    return res.status(400).json({ error: `Invalid rating. Must be one of: ${validRatings.join(', ')}` });
  }
  next();
};
