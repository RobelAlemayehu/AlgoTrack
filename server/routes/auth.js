const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const User = require('../models/User');
const OTP = require('../models/OTP');
const auth = require('../middleware/auth');
const { generateOTP, hashOTP, generateResetToken, verifyResetToken } = require('../utils/cryptoUtils');
const { sendOTPEmail } = require('../utils/emailService');

// Rate limiter for requesting OTPs: max 3 requests per 15 minutes per IP
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { msg: 'Too many verification code requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Helper function to create, hash, store, and send an OTP via email.
 */
async function createAndSendOTP(email, purpose, username = '') {
  const normEmail = email.toLowerCase().trim();

  // Clear any existing active OTP for this email and purpose
  await OTP.deleteMany({ email: normEmail, purpose });

  // Generate 6-digit OTP
  const rawCode = generateOTP();
  const otpCodeHash = hashOTP(rawCode);

  // Store in database with 10-minute expiry
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const otpDoc = new OTP({
    email: normEmail,
    otpCodeHash,
    purpose,
    expiresAt,
    attempts: 0
  });
  await otpDoc.save();

  // Send email (rawCode is passed to Nodemailer, never logged)
  await sendOTPEmail({ email: normEmail, otpCode: rawCode, purpose, username });
}

// ── 1. Register User ─────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ msg: "Username, email, and password are required." });
    }

    const normEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: normEmail });
    if (user) return res.status(400).json({ msg: "User already exists with this email." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const defaultSlug = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    user = new User({ 
      username, 
      email: normEmail, 
      password: hashedPassword,
      emailVerified: false,
      publicProfile: {
        enabled: true,
        slug: defaultSlug,
        views: 0
      }
    });
    
    await user.save();

    // Automatically send OTP for email verification
    try {
      await createAndSendOTP(normEmail, 'signup_verification', user.username);
    } catch (emailErr) {
      console.error("Failed to send signup OTP email:", emailErr.message);
    }

    res.json({ 
      msg: "Account created! Please verify your email with the verification code sent.",
      requiresVerification: true,
      email: normEmail
    });

  } catch (err) {
    console.error("Register Error:", err); 
    res.status(500).json({ error: err.message });
  }
});

// ── 2. Login User ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required." });
    }

    const normEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normEmail });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });
    if (user.isDeleted) {
      return res.status(400).json({ msg: "Account deleted. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Enforce email verification before logging in
    if (!user.emailVerified) {
      try {
        await createAndSendOTP(normEmail, 'signup_verification', user.username);
      } catch (emailErr) {
        console.error("Failed to send verification code on login:", emailErr.message);
      }

      return res.status(403).json({
        requiresVerification: true,
        email: normEmail,
        msg: "Your email is not verified yet. A verification code has been sent to your email address."
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
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

// ── 3. Send OTP (Signup Verification & Password Reset) ───────────────────────
router.post('/send-otp', otpRateLimiter, async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email || !purpose) {
      return res.status(400).json({ msg: "Email and purpose are required." });
    }

    if (!['signup_verification', 'password_reset'].includes(purpose)) {
      return res.status(400).json({ msg: "Invalid verification purpose." });
    }

    const normEmail = email.toLowerCase().trim();
    let username = '';

    const user = await User.findOne({ email: normEmail });
    if (purpose === 'password_reset') {
      // To prevent email enumeration attacks, always return generic success message
      if (!user) {
        return res.json({ msg: "If this email is registered, a verification code has been sent." });
      }
      username = user.username;
    } else if (purpose === 'signup_verification') {
      if (user) {
        username = user.username;
      }
    }

    await createAndSendOTP(normEmail, purpose, username);

    res.json({ msg: "If this email is registered, a verification code has been sent." });

  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(500).json({ error: "Failed to send verification code. Please try again." });
  }
});

// ── 4. Verify OTP ─────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code, purpose } = req.body;
    if (!email || !code || !purpose) {
      return res.status(400).json({ msg: "Email, code, and purpose are required." });
    }

    const normEmail = email.toLowerCase().trim();
    const cleanCode = String(code).trim();

    const otpDoc = await OTP.findOne({ email: normEmail, purpose });

    if (!otpDoc) {
      return res.status(400).json({ msg: "Verification code expired or invalid. Please request a new code." });
    }

    // Check expiry
    if (new Date() > new Date(otpDoc.expiresAt)) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ msg: "Verification code has expired. Please request a new code." });
    }

    // Check lockout limit (5 failed attempts max)
    if (otpDoc.attempts >= 5) {
      return res.status(400).json({ msg: "Too many failed attempts. Please request a new verification code." });
    }

    // Hash incoming code and compare with stored hash
    const incomingHash = hashOTP(cleanCode);
    if (incomingHash !== otpDoc.otpCodeHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();

      if (otpDoc.attempts >= 5) {
        return res.status(400).json({ msg: "Too many failed attempts. Lockout triggered. Please request a new verification code." });
      }

      const remaining = 5 - otpDoc.attempts;
      return res.status(400).json({ msg: `Invalid verification code. ${remaining} attempt(s) remaining.` });
    }

    // OTP matched! Delete the OTP record so it cannot be reused.
    await OTP.deleteOne({ _id: otpDoc._id });

    if (purpose === 'signup_verification') {
      const user = await User.findOne({ email: normEmail });
      if (!user) {
        return res.status(404).json({ msg: "User account not found." });
      }

      user.emailVerified = true;
      user.lastLogin = new Date();
      await user.save();

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

      return res.json({
        msg: "Email verified successfully!",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          emailVerified: true,
          tier: user.tier || "Free Tier",
          isAdmin: user.isAdmin || false,
          hasCompletedOnboarding: user.hasCompletedOnboarding || false
        }
      });

    } else if (purpose === 'password_reset') {
      const user = await User.findOne({ email: normEmail });
      if (!user) {
        return res.status(404).json({ msg: "User account not found." });
      }

      // Generate short-lived reset token (15 mins)
      const resetToken = generateResetToken(normEmail);

      return res.json({
        msg: "Code verified successfully.",
        resetToken
      });
    } else {
      return res.status(400).json({ msg: "Invalid verification purpose." });
    }

  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ error: "Failed to verify code. Please try again." });
  }
});

// ── 5. Reset Password ─────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ msg: "Email, reset token, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: "New password must be at least 6 characters." });
    }

    const normEmail = email.toLowerCase().trim();

    let decoded;
    try {
      decoded = verifyResetToken(resetToken);
    } catch (tokenErr) {
      return res.status(400).json({ msg: "Reset session expired or invalid. Please request a new code." });
    }

    if (decoded.email !== normEmail) {
      return res.status(400).json({ msg: "Invalid reset token for this email." });
    }

    const user = await User.findOne({ email: normEmail });
    if (!user) {
      return res.status(404).json({ msg: "User account not found." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.emailVerified = true; // Password reset via email OTP also confirms email ownership
    await user.save();

    res.json({ msg: "Password reset successful! Please log in with your new password." });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
});

// ── 6. Get User Profile ───────────────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified || false,
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

    await Problem.deleteMany({ userId });
    await UserDrill.deleteMany({ userId });
    await UserRoadmapProgress.deleteMany({ userId });
    await SyncLog.deleteMany({ userId });
    await ContestSimulation.deleteMany({ userId });
    await Group.deleteMany({ createdBy: userId });
    await Group.updateMany({ members: userId }, { $pull: { members: userId } });
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