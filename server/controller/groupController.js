const Group = require('../models/Group');
const User = require('../models/User');
const Problem = require('../models/Problem');
const crypto = require('crypto');

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

  if (daySet.size === 0) return 0;

  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterdayDate);

  if (!daySet.has(todayStr) && !daySet.has(yesterdayStr)) return 0;

  const startStr = daySet.has(todayStr) ? todayStr : yesterdayStr;
  const parts = startStr.split('-').map(Number);
  const curr = new Date(parts[0], parts[1] - 1, parts[2]);

  let streak = 0;
  while (true) {
    const checkStr = getLocalDateStr(curr);
    if (daySet.has(checkStr)) {
      streak++;
      curr.setDate(curr.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Generate unique invite code e.g. GRP-A8K9X2
function generateInviteCode() {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `GRP-${rand}`;
}

// Create a new study group
exports.createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 50) {
      return res.status(400).json({ error: 'Group name must be between 2 and 50 characters.' });
    }

    let inviteCode = generateInviteCode();
    while (await Group.findOne({ inviteCode })) {
      inviteCode = generateInviteCode();
    }

    const group = new Group({
      name: cleanName,
      inviteCode,
      createdBy: req.user.id,
      members: [req.user.id]
    });

    await group.save();
    res.status(201).json({ message: 'Group created successfully', group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Join a study group via invite code
exports.joinGroup = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const cleanCode = inviteCode.trim().toUpperCase();
    const group = await Group.findOne({ inviteCode: cleanCode });

    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code. Group not found.' });
    }

    if (group.members.some(m => m.toString() === req.user.id)) {
      return res.status(400).json({ error: 'You are already a member of this group.' });
    }

    if (group.members.length >= 20) {
      return res.status(400).json({ error: 'This study group has reached its maximum capacity of 20 members.' });
    }

    group.members.push(req.user.id);
    await group.save();

    res.json({ message: 'Successfully joined group!', group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Leave a study group
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    group.members = group.members.filter(m => m.toString() !== req.user.id);
    await group.save();

    res.json({ message: 'Left group successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get list of groups the user belongs to
exports.getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    const formatted = groups.map(g => ({
      _id: g._id,
      name: g.name,
      inviteCode: g.inviteCode,
      createdBy: g.createdBy ? g.createdBy.username : 'Unknown',
      memberCount: g.members.length,
      createdAt: g.createdAt
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get group leaderboard (This Week / This Month / All Time)
exports.getGroupLeaderboard = async (req, res) => {
  try {
    const { groupId } = req.params;
    const windowType = req.query.window || 'this_week';

    const group = await Group.findById(groupId).populate('members', 'username handles cfRating cfRank lcStats lcCalendar goals createdAt');
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!group.members.some(m => m._id.toString() === req.user.id)) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this study group.' });
    }

    // Determine window start date
    let startDate = null;
    const now = new Date();

    if (windowType === 'this_week') {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diffToMon));
      startDate.setHours(0, 0, 0, 0);
    } else if (windowType === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const leaderboardEntries = await Promise.all(group.members.map(async (member) => {
      const query = { userId: member._id, archived: { $ne: true } };
      if (startDate) {
        query.$or = [
          { solvedAt: { $gte: startDate } },
          { syncedAt: { $gte: startDate } },
          { createdAt: { $gte: startDate } }
        ];
      }

      const problems = await Problem.find(query);
      const allUserProblems = await Problem.find({ userId: member._id, archived: { $ne: true } });

      const lcCount = Math.max(member.lcStats?.total || 0, problems.filter(p => p.platform === 'LeetCode').length);
      const cfCount = problems.filter(p => p.platform === 'Codeforces').length;
      const otherCount = problems.filter(p => p.platform !== 'LeetCode' && p.platform !== 'Codeforces').length;
      const totalSolved = lcCount + cfCount + otherCount;

      const streak = calcStreak(allUserProblems, member.lcCalendar);
      const weeklyTarget = member.goals?.weeklyTarget || 5;
      const targetPercent = Math.min(100, Math.round((totalSolved / weeklyTarget) * 100));

      return {
        userId: member._id,
        username: member.username,
        handles: {
          leetcode: member.handles?.leetcode || '',
          codeforces: member.handles?.codeforces || ''
        },
        cfRank: member.cfRank || '',
        cfRating: member.cfRating || 0,
        totalSolved,
        lcCount,
        cfCount,
        streak,
        weeklyTarget,
        targetPercent
      };
    }));

    // Rank members by totalSolved descending, then streak descending
    leaderboardEntries.sort((a, b) => b.totalSolved - a.totalSolved || b.streak - a.streak);

    res.json({
      group: {
        _id: group._id,
        name: group.name,
        inviteCode: group.inviteCode,
        memberCount: group.members.length,
        createdAt: group.createdAt
      },
      window: windowType,
      leaderboard: leaderboardEntries
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
