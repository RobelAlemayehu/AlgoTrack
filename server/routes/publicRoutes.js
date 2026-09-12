const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getPublicProfileBySlug,
  getMyPublicProfileConfig,
  updatePublicProfileConfig
} = require('../controller/publicProfileController');

// Authenticated user settings routes
router.get('/config/me', auth, getMyPublicProfileConfig);
router.post('/config/update', auth, updatePublicProfileConfig);

// Public route (unauthenticated)
router.get('/:slug', getPublicProfileBySlug);

module.exports = router;
