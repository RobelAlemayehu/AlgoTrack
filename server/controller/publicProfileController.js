const User = require('../models/User');
const Problem = require('../models/Problem');
const UserRoadmapProgress = require('../models/UserRoadmapProgress');
const Roadmap = require('../models/Roadmap');

function getLocalDateStr(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calcStreak(problems, lcCalendar) {
  const daySet = new Set();
  (problems || []).forEach(p => {
    if (p.archived) return;
    const dayStr = getLocalDateStr(p.solvedAt || p.createdAt);
    if (dayStr) daySet.add(dayStr);
  });

  Object.keys(lcCalendar || {}).forEach(ts => {
    const count = lcCalendar[ts];
    if (count > 0) {
      const num = Number(ts);
      if (!isNaN(num) && num > 0) {
        const dayStr = getLocalDateStr(num * 1000);
        if (dayStr) daySet.add(dayStr);
      }
    }
  });

  if (daySet.size === 0) return { currentStreak: 0, maxStreak: 0 };

  const dates = Array.from(daySet).sort();
  let maxStreak = 0;
  let currStreak = 0;
  let prevDate = null;

  dates.forEach(dStr => {
    const d = new Date(dStr);
    if (!prevDate) {
      currStreak = 1;
    } else {
      const diffDays = Math.round((d - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currStreak++;
      } else if (diffDays > 1) {
        currStreak = 1;
      }
    }
    if (currStreak > maxStreak) maxStreak = currStreak;
    prevDate = d;
  });

  // Calculate current streak relative to today
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterdayDate);

  let activeCurrentStreak = 0;
  if (daySet.has(todayStr) || daySet.has(yesterdayStr)) {
    const startStr = daySet.has(todayStr) ? todayStr : yesterdayStr;
    const parts = startStr.split('-').map(Number);
    const curr = new Date(parts[0], parts[1] - 1, parts[2]);

    while (true) {
      const checkStr = getLocalDateStr(curr);
      if (daySet.has(checkStr)) {
        activeCurrentStreak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return { currentStreak: activeCurrentStreak, maxStreak };
}

// GET /api/public/:slug - Unauthenticated public profile route
const getPublicProfileBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: 'Slug is required' });

    const cleanSlug = slug.trim().toLowerCase();

    // Find user with enabled public profile and matching slug
    const user = await User.findOne({
      'publicProfile.slug': cleanSlug,
      'publicProfile.enabled': true
    });

    if (!user) {
      return res.status(404).json({ error: 'Public profile not found or private.' });
    }

    // Increment page views server-side
    user.publicProfile.views = (user.publicProfile.views || 0) + 1;
    await user.save();

    // Fetch user problems
    const problems = await Problem.find({
      userId: user._id,
      archived: { $ne: true }
    });

    const lcSolved = problems.filter(p => p.platform === 'LeetCode');
    const cfSolved = problems.filter(p => p.platform === 'Codeforces');
    const otherSolved = problems.filter(p => p.platform !== 'LeetCode' && p.platform !== 'Codeforces');

    const lcCount = Math.max(user.lcStats?.total || 0, lcSolved.length);
    const cfCount = cfSolved.length;
    const otherCount = otherSolved.length;
    const totalSolved = lcCount + cfCount + otherCount;

    // Difficulty breakdown
    let easyCount = 0, mediumCount = 0, hardCount = 0;
    problems.forEach(p => {
      const diff = (p.difficulty || '').toLowerCase();
      if (diff === 'easy' || parseInt(diff) < 1200) easyCount++;
      else if (diff === 'medium' || (parseInt(diff) >= 1200 && parseInt(diff) < 1700)) mediumCount++;
      else if (diff === 'hard' || parseInt(diff) >= 1700) hardCount++;
    });

    // Streak
    const { currentStreak, maxStreak } = calcStreak(problems, user.lcCalendar);

    // Fetch roadmap progress summary
    const roadmapsProgress = await UserRoadmapProgress.find({ userId: user._id });
    const roadmapSummaries = [];

    for (const rp of roadmapsProgress) {
      const rm = await Roadmap.findById(rp.roadmapId);
      if (rm) {
        const solvedCount = problems.filter(p => rm.problems.some(rmP => (rmP.problemId || '').toLowerCase() === (p.problemId || '').toLowerCase())).length;
        roadmapSummaries.push({
          title: rm.title,
          totalProblems: rm.problems.length,
          solvedCount,
          percent: Math.round((solvedCount / (rm.problems.length || 1)) * 100)
        });
      }
    }

    // SANITIZED Output Object — ZERO private fields
    const publicData = {
      username: user.username,
      profilePic: user.profilePic || '',
      cfRating: user.cfRating || 0,
      cfMaxRating: user.cfMaxRating || 0,
      cfRank: user.cfRank || '',
      handles: {
        leetcode: user.handles?.leetcode || '',
        codeforces: user.handles?.codeforces || ''
      },
      stats: {
        totalSolved,
        lcCount,
        cfCount,
        otherCount,
        easyCount,
        mediumCount,
        hardCount,
        currentStreak,
        maxStreak,
        pageViews: user.publicProfile.views
      },
      badges: user.badges || [],
      lcCalendar: user.lcCalendar || {},
      roadmapSummaries,
      createdAt: user.createdAt
    };

    res.json({ publicProfile: publicData });

  } catch (err) {
    console.error('getPublicProfileBySlug Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/user/public-profile - Get authenticated user's public profile config
const getMyPublicProfileConfig = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const defaultSlug = (user.username || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');

    res.json({
      publicProfile: {
        enabled: user.publicProfile?.enabled || false,
        slug: user.publicProfile?.slug || defaultSlug,
        views: user.publicProfile?.views || 0
      }
    });
  } catch (err) {
    console.error('getMyPublicProfileConfig Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/user/public-profile - Update public profile configuration
const updatePublicProfileConfig = async (req, res) => {
  try {
    const { enabled, slug } = req.body;
    const user = await User.findById(req.user.id);

    if (typeof enabled === 'boolean') {
      user.publicProfile.enabled = enabled;
    }

    if (slug) {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (cleanSlug.length < 3 || cleanSlug.length > 30) {
        return res.status(400).json({ error: 'Slug must be between 3 and 30 alphanumeric characters (dashes & underscores allowed).' });
      }

      // Check slug uniqueness
      const existing = await User.findOne({
        'publicProfile.slug': cleanSlug,
        _id: { $ne: req.user.id }
      });

      if (existing) {
        return res.status(400).json({ error: 'This public profile URL slug is already taken by another user.' });
      }

      user.publicProfile.slug = cleanSlug;
    }

    await user.save();

    res.json({
      message: 'Public profile updated successfully.',
      publicProfile: user.publicProfile
    });

  } catch (err) {
    console.error('updatePublicProfileConfig Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getPublicProfileBySlug,
  getMyPublicProfileConfig,
  updatePublicProfileConfig
};
