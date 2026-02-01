const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth'); 
router.put('/settings', auth, async (req, res) => {
    try {
        const { leetcode, codeforces } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { 
                $set: { 
                    'handles.leetcode': leetcode, 
                    'handles.codeforces': codeforces 
                } 
            },
            { new: true } 
        ).select('-password'); 

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;