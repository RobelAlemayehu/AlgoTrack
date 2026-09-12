const express = require('express');
const router = express.Router();
const { updateNote, getNotes, updateHintTier } = require('../controller/noteController');
const auth = require('../middleware/auth');

router.get('/', auth, getNotes);
router.patch('/:id', auth, updateNote);
router.put('/:id/hint-tier', auth, updateHintTier);

module.exports = router;
