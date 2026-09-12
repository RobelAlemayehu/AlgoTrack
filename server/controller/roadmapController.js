const Roadmap = require('../models/Roadmap');
const UserRoadmapProgress = require('../models/UserRoadmapProgress');
const Problem = require('../models/Problem');

// GET /api/roadmaps - Get all roadmaps with progress summary
const getRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({}).sort({ createdAt: -1 });

    // Fetch user's solved problems
    const userProblems = await Problem.find({
      userId: req.user.id,
      archived: { $ne: true }
    }).select('problemId platform title');

    const solvedSet = new Set(userProblems.map(p => (p.problemId || '').toLowerCase().trim()));

    // Fetch user's in-progress records
    const progressRecords = await UserRoadmapProgress.find({ userId: req.user.id });
    const progressMap = {};
    progressRecords.forEach(r => {
      progressMap[r.roadmapId.toString()] = r.inProgressProblemIds || [];
    });

    const result = roadmaps.map(rm => {
      const inProgressList = progressMap[rm._id.toString()] || [];
      const inProgressSet = new Set(inProgressList.map(id => id.toLowerCase().trim()));

      let solvedCount = 0;
      let inProgressCount = 0;

      rm.problems.forEach(p => {
        const pId = (p.problemId || '').toLowerCase().trim();
        if (solvedSet.has(pId)) {
          solvedCount++;
        } else if (inProgressSet.has(pId)) {
          inProgressCount++;
        }
      });

      const total = rm.problems.length || 1;
      const progressPercent = Math.round((solvedCount / total) * 100);

      return {
        _id: rm._id,
        title: rm.title,
        slug: rm.slug,
        description: rm.description,
        category: rm.category,
        totalProblems: rm.problems.length,
        solvedCount,
        inProgressCount,
        unsolvedCount: rm.problems.length - solvedCount - inProgressCount,
        progressPercent
      };
    });

    res.json({ roadmaps: result });
  } catch (err) {
    console.error('getRoadmaps Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/roadmaps/:slug - Get single roadmap details with topic grouping & status
const getRoadmapBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const roadmap = await Roadmap.findOne({ slug });
    if (!roadmap) return res.status(404).json({ error: 'Roadmap not found' });

    // Fetch user's solved problems
    const userProblems = await Problem.find({
      userId: req.user.id,
      archived: { $ne: true }
    }).select('problemId platform title solvedAt');

    const solvedSet = new Set(userProblems.map(p => (p.problemId || '').toLowerCase().trim()));

    // Fetch user's in-progress progress
    const progressRecord = await UserRoadmapProgress.findOne({
      userId: req.user.id,
      roadmapId: roadmap._id
    });

    const inProgressList = progressRecord?.inProgressProblemIds || [];
    const inProgressSet = new Set(inProgressList.map(id => id.toLowerCase().trim()));

    let solvedCount = 0;
    let inProgressCount = 0;

    const annotatedProblems = roadmap.problems.map(p => {
      const pId = (p.problemId || '').toLowerCase().trim();
      let status = 'unsolved';

      if (solvedSet.has(pId)) {
        status = 'solved';
        solvedCount++;
      } else if (inProgressSet.has(pId)) {
        status = 'in_progress';
        inProgressCount++;
      }

      // Direct platform link
      let externalUrl = '';
      if (p.platform === 'LeetCode') {
        externalUrl = `https://leetcode.com/problems/${p.problemId}/`;
      } else if (p.platform === 'Codeforces') {
        const match = p.problemId.match(/^CF-(\d+)([A-Z0-9]+)$/i);
        if (match) {
          externalUrl = `https://codeforces.com/problemset/problem/${match[1]}/${match[2]}`;
        } else {
          externalUrl = `https://codeforces.com/problemset`;
        }
      }

      return {
        _id: p._id,
        title: p.title,
        platform: p.platform,
        problemId: p.problemId,
        difficulty: p.difficulty,
        tags: p.tags || [],
        category: p.category || 'General',
        order: p.order || 0,
        status, // 'solved' | 'in_progress' | 'unsolved'
        externalUrl
      };
    });

    // Group by category
    const categoriesMap = {};
    annotatedProblems.forEach(p => {
      const cat = p.category || 'General';
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push(p);
    });

    const groupedCategories = Object.entries(categoriesMap).map(([categoryName, problems]) => ({
      name: categoryName,
      problems: problems.sort((a, b) => a.order - b.order),
      solvedCount: problems.filter(p => p.status === 'solved').length,
      totalCount: problems.length
    }));

    const total = annotatedProblems.length || 1;
    const progressPercent = Math.round((solvedCount / total) * 100);

    res.json({
      roadmap: {
        _id: roadmap._id,
        title: roadmap.title,
        slug: roadmap.slug,
        description: roadmap.description,
        category: roadmap.category,
        totalProblems: annotatedProblems.length,
        solvedCount,
        inProgressCount,
        unsolvedCount: annotatedProblems.length - solvedCount - inProgressCount,
        progressPercent,
        categories: groupedCategories,
        problems: annotatedProblems
      }
    });

  } catch (err) {
    console.error('getRoadmapBySlug Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/roadmaps/:slug/toggle-progress - Toggle in-progress status for a problem
const toggleInProgress = async (req, res) => {
  try {
    const { slug } = req.params;
    const { problemId, inProgress } = req.body;

    if (!problemId) return res.status(400).json({ error: 'problemId is required' });

    const roadmap = await Roadmap.findOne({ slug });
    if (!roadmap) return res.status(404).json({ error: 'Roadmap not found' });

    let record = await UserRoadmapProgress.findOne({
      userId: req.user.id,
      roadmapId: roadmap._id
    });

    if (!record) {
      record = new UserRoadmapProgress({
        userId: req.user.id,
        roadmapId: roadmap._id,
        inProgressProblemIds: []
      });
    }

    const cleanId = problemId.trim();
    const existingIndex = record.inProgressProblemIds.findIndex(id => id.toLowerCase() === cleanId.toLowerCase());

    if (inProgress) {
      if (existingIndex === -1) {
        record.inProgressProblemIds.push(cleanId);
      }
    } else {
      if (existingIndex !== -1) {
        record.inProgressProblemIds.splice(existingIndex, 1);
      }
    }

    record.updatedAt = new Date();
    await record.save();

    res.json({
      message: inProgress ? 'Marked as in progress' : 'Removed from in progress',
      inProgressProblemIds: record.inProgressProblemIds
    });

  } catch (err) {
    console.error('toggleInProgress Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getRoadmaps, getRoadmapBySlug, toggleInProgress };
