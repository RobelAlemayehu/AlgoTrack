const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "User already exists." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ 
            username, 
            email, 
            password: hashedPassword 
        });
        
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ 
            msg: "User registered successfully!",
            token,
            user: { id: user._id, username: user.username }
        });

    } catch (err) {
        console.error("Register Error:", err); 
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        tier: user.tier || "Free Tier"
      }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      handles: user.handles || { leetcode: '', codeforces: '' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { handles } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { handles },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      handles: user.handles || { leetcode: '', codeforces: '' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;