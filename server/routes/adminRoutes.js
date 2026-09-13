const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const Problem = require('../models/Problem');
const SyncLog = require('../models/SyncLog');

// Apply both auth and admin middleware to all routes in this router
router.use(auth);
router.use(admin);

// GET /api/admin/users - Paginated user list with solved counts
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const totalUsers = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('username email handles.leetcode handles.codeforces createdAt lastSync isDeleted deletedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = users.map(u => u._id);

    // Compute solved problem counts per user
    const problemCounts = await Problem.aggregate([
      { $match: { userId: { $in: userIds }, archived: { $ne: true } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);

    const solvedMap = {};
    problemCounts.forEach(item => {
      if (item._id) solvedMap[item._id.toString()] = item.count;
    });

    const sanitizedUsers = users.map(u => ({
      id: u._id,
      username: u.username,
      email: u.email,
      isDeleted: u.isDeleted || false,
      deletedAt: u.deletedAt || null,
      handles: {
        leetcode: u.handles?.leetcode || '',
        codeforces: u.handles?.codeforces || ''
      },
      createdAt: u.createdAt,
      lastSync: {
        leetcode: u.lastSync?.leetcode || null,
        codeforces: u.lastSync?.codeforces || null
      },
      totalSolved: solvedMap[u._id.toString()] || 0
    }));

    res.json({
      users: sanitizedUsers,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit) || 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/sync-health - Recent sync activity and failure reports
router.get('/sync-health', async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [logs24h, logs7d, failures] = await Promise.all([
      SyncLog.aggregate([
        { $match: { timestamp: { $gte: last24h } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      SyncLog.aggregate([
        { $match: { timestamp: { $gte: last7d } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      SyncLog.find({ status: 'failure' })
        .sort({ timestamp: -1 })
        .limit(20)
        .populate('userId', 'username email')
        .lean()
    ]);

    const map24h = { success: 0, failure: 0 };
    logs24h.forEach(l => { map24h[l._id] = l.count; });

    const map7d = { success: 0, failure: 0 };
    logs7d.forEach(l => { map7d[l._id] = l.count; });

    const recentFailures = failures.map(f => ({
      id: f._id,
      userId: f.userId?._id || f.userId,
      user: f.userId?.username || f.userId?.email || 'Unknown User',
      platform: f.platform,
      timestamp: f.timestamp,
      errorMessage: f.errorMessage || 'Unknown error'
    }));

    res.json({
      syncs24h: {
        success: map24h.success,
        failure: map24h.failure,
        total: map24h.success + map24h.failure
      },
      syncs7d: {
        success: map7d.success,
        failure: map7d.failure,
        total: map7d.success + map7d.failure
      },
      recentFailures
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats - Basic aggregate platform statistics
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers7d, totalProblemsTracked] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({
        $or: [
          { lastLogin: { $gte: last7d } },
          { 'lastSync.leetcode': { $gte: last7d } },
          { 'lastSync.codeforces': { $gte: last7d } },
          { createdAt: { $gte: last7d } }
        ]
      }),
      Problem.countDocuments({ archived: { $ne: true } })
    ]);

    res.json({
      totalUsers,
      activeUsers7d,
      totalProblemsTracked
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
