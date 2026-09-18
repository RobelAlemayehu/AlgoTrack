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

        const defaultSlug = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        user = new User({ 
            username, 
            email, 
            password: hashedPassword,
            publicProfile: {
                enabled: true,
                slug: defaultSlug,
                views: 0
            }
        });
        
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ 
            msg: "User registered successfully!",
            token,
            user: {
                id: user._id,
                username: user.username,
                hasCompletedOnboarding: false
            }
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
    if (user.isDeleted) {
      return res.status(400).json({ msg: "Account deleted. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        tier: user.tier || "Free Tier",
        isAdmin: user.isAdmin || false,
        hasCompletedOnboarding: user.hasCompletedOnboarding || false
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
      isAdmin:    user.isAdmin    || false,
      hasCompletedOnboarding: user.hasCompletedOnboarding || false,
      handles:    user.handles    || { leetcode: '', codeforces: '', lcSession: '' },
      lcStats:    user.lcStats    || {},
      lcCalendar: user.lcCalendar || {},
      cfRating:   user.cfRating   || 0,
      cfMaxRating:user.cfMaxRating|| 0,
      cfRank:     user.cfRank     || '',
      lastSync:   user.lastSync   || {},
      goals:      user.goals      || { weeklyTarget: 5, streakFreezes: 0 },
      badges:     user.badges     || [],
      preferences:user.preferences|| { theme: 'dark' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile / settings
router.put('/profile', auth, async (req, res) => {
  try {
    const { handles, goals, preferences } = req.body;
    const update = {};
    if (handles) update.handles = handles;
    if (goals) update.goals = goals;
    if (preferences) update.preferences = preferences;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      handles: user.handles || { leetcode: '', codeforces: '', lcSession: '' },
      goals: user.goals || { weeklyTarget: 5, streakFreezes: 0 },
      preferences: user.preferences || { theme: 'dark' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ msg: 'No refresh token provided' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ msg: 'Invalid refresh token' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(403).json({ error: 'Token expired or invalid' });
  }
});

// Update password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Please provide both current and new passwords' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update username
router.put('/username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ msg: 'Username is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { username: username.trim() } },
      { new: true }
    ).select('-password');

    res.json({ msg: 'Username updated', username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user account permanently from database
router.delete('/account', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const Problem = require('../models/Problem');
    const Group = require('../models/Group');
    const UserDrill = require('../models/UserDrill');
    const UserRoadmapProgress = require('../models/UserRoadmapProgress');
    const SyncLog = require('../models/SyncLog');
    const ContestSimulation = require('../models/ContestSimulation');

    // 1. Delete all problems solved/tracked by user
    await Problem.deleteMany({ userId });

    // 2. Delete user's drills, roadmap progress, sync logs, and contest simulations
    await UserDrill.deleteMany({ userId });
    await UserRoadmapProgress.deleteMany({ userId });
    await SyncLog.deleteMany({ userId });
    await ContestSimulation.deleteMany({ userId });

    // 3. Delete any groups created by this user permanently from database
    await Group.deleteMany({ createdBy: userId });

    // 4. Remove user from members list of any other groups they joined
    await Group.updateMany({ members: userId }, { $pull: { members: userId } });

    // 5. Permanently remove the user document from database
    await User.findByIdAndDelete(userId);

    res.json({ msg: 'Account and all associated data permanently removed from database' });
  } catch (err) {
    console.error('Account Deletion Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update onboarding status
router.put('/onboarding', auth, async (req, res) => {
  try {
    const { completed } = req.body;
    const isCompleted = completed !== undefined ? Boolean(completed) : true;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { hasCompletedOnboarding: isCompleted } },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    res.json({
      msg: 'Onboarding status updated',
      hasCompletedOnboarding: user.hasCompletedOnboarding
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update onboarding status' });
  }
});

module.exports = router;