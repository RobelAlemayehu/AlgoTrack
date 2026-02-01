const express = require('express');
const router = express.Router();
const { updateNote } = require('../controller/noteController');
const auth = require('../middleware/auth');



router.patch('/:id', auth, updateNote);

module.exports = router;
