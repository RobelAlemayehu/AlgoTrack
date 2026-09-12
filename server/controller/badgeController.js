const User = require('../models/User');
const Problem = require('../models/Problem');
const { calculateStreak } = require('../utils/streak');

const BADGE_DEFINITIONS = [
  { id: 'first-ac',      name: 'First Accepted', description: 'Solved your first DSA problem',                    iconKey: 'Target' },
  { id: '50-solved',     name: 'Half-Century',   description: 'Solved 50 DSA problems',                           iconKey: 'Zap' },
  { id: '100-solved',    name: 'Centurion',      description: 'Solved 100 DSA problems',                          iconKey: 'Award' },
  { id: '200-solved',    name: 'DSA Veteran',    description: 'Solved 200 DSA problems',                          iconKey: 'Flame' },
  { id: 'expert-coder',  name: 'Expert Coder',   description: 'Reached 1600+ CF Rating or solved a Medium/Hard',  iconKey: 'ShieldAlert' },
  { id: 'master-coder',  name: 'Master Coder',   description: 'Reached 1900+ CF Rating or solved a 1900+ problem',iconKey: 'Crown' },
  { id: 'streak-7',      name: 'Weekly Warrior', description: 'Maintained a 7-day streak',                       iconKey: 'Calendar' },
  { id: 'streak-30',     name: 'Unstoppable',    description: 'Maintained a 30-day streak',                       iconKey: 'Trophy' },
  { id: 'polyglot',      name: 'Dual Platform',  description: 'Solved problems on both LeetCode and Codeforces',  iconKey: 'Swords' }
];

exports.checkAndAwardBadges = async (userId, tzOffsetMinutes = 0) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const activeProblems = await Problem.find({ userId, archived: { $ne: true } });
    const totalCount = activeProblems.length;
    const lcCount = activeProblems.filter(p => p.platform === 'LeetCode').length;
    const cfCount = activeProblems.filter(p => p.platform === 'Codeforces').length;
    const hasHard = activeProblems.some(p => p.difficulty === 'Hard' || (Number(p.difficulty) >= 1900));

    const streak = calculateStreak(activeProblems, user.lcCalendar || {}, tzOffsetMinutes);

    const currentBadges = new Set((user.badges || []).map(b => b.id));
    const newBadges = [];

    const award = (badge) => {
      if (!badge) return;
      if (!currentBadges.has(badge.id)) {
        newBadges.push({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          iconKey: badge.iconKey,
          earnedAt: new Date(),
          seen: false
        });
      }
    };

    if (totalCount >= 1) award(BADGE_DEFINITIONS.find(b => b.id === 'first-ac'));
    if (totalCount >= 50) award(BADGE_DEFINITIONS.find(b => b.id === '50-solved'));
    if (totalCount >= 100) award(BADGE_DEFINITIONS.find(b => b.id === '100-solved'));
    if (totalCount >= 200) award(BADGE_DEFINITIONS.find(b => b.id === '200-solved'));

    if (user.cfRating >= 1600 || hasHard) award(BADGE_DEFINITIONS.find(b => b.id === 'expert-coder'));
    if (user.cfRating >= 1900 || activeProblems.some(p => Number(p.difficulty) >= 1900)) award(BADGE_DEFINITIONS.find(b => b.id === 'master-coder'));

    if (streak >= 7) award(BADGE_DEFINITIONS.find(b => b.id === 'streak-7'));
    if (streak >= 30) award(BADGE_DEFINITIONS.find(b => b.id === 'streak-30'));

    if (lcCount > 0 && cfCount > 0) award(BADGE_DEFINITIONS.find(b => b.id === 'polyglot'));

    if (newBadges.length > 0) {
      user.badges = [...(user.badges || []), ...newBadges];
      await user.save();
    }

    return user.badges;
  } catch (err) {
    console.error('[Badges] Error checking badges:', err.message);
    return [];
  }
};

exports.getUserBadges = async (req, res) => {
  try {
    const badges = await exports.checkAndAwardBadges(req.user.id);
    res.json(badges || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markBadgesSeen = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user && user.badges) {
      user.badges.forEach(b => { b.seen = true; });
      await user.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
