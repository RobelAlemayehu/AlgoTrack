const express = require('express');
const router = express.Router();
const { updateNote, getNotes } = require('../controller/noteController');
const auth = require('../middleware/auth');

router.get('/', auth, getNotes);
router.patch('/:id', auth, updateNote);

module.exports = router;
