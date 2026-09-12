const axios = require('axios');
const ContestSimulation = require('../models/ContestSimulation');
const Problem = require('../models/Problem');
const User = require('../models/User');

// Helper shuffle (Fisher-Yates)
const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// POST /api/simulator/start - Start a new contest simulation
const startSimulation = async (req, res) => {
  try {
    const { problemCount = 4, minRating = 1000, maxRating = 1600, durationMinutes = 60 } = req.body;

    // Check if there is already an active simulation
    const active = await ContestSimulation.findOne({
      userId: req.user.id,
      completed: false
    });

    if (active) {
      // Check if duration has expired
      const elapsedMs = Date.now() - new Date(active.startedAt).getTime();
      const durationMs = active.durationMinutes * 60 * 1000;
      if (elapsedMs < durationMs) {
        return res.json({ simulation: active, isExisting: true });
      }
    }

    // Fetch user solved problems
    const userProblems = await Problem.find({
      userId: req.user.id,
      archived: { $ne: true }
    });
    const solvedSet = new Set(userProblems.map(p => (p.problemId || '').toLowerCase().trim()));

    // Fetch real CF problems
    let candidates = [];
    try {
      const cfRes = await axios.get('https://codeforces.com/api/problemset.problems', { timeout: 8000 });
      if (cfRes.data?.status === 'OK') {
        const probs = cfRes.data.result?.problems || [];
        candidates = probs
          .filter(p => p.contestId && p.rating && p.rating >= minRating && p.rating <= maxRating)
          .map(p => {
            const pId = `CF-${p.contestId}${p.index}`;
            return {
              problemId: pId,
              title: p.name,
              platform: 'Codeforces',
              difficulty: p.rating.toString(),
              tags: p.tags || [],
              url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
              status: 'unsolved',
              markTimestamp: null,
              autoConfirmed: false
            };
          });
      }
    } catch (err) {
      console.error('[Simulator] CF problemset API fetch failed:', err.message);
    }

    // Filter out already solved problems
    const unsolvedCandidates = candidates.filter(p => !solvedSet.has(p.problemId.toLowerCase().trim()));
    const poolToUse = unsolvedCandidates.length >= problemCount ? unsolvedCandidates : candidates;

    if (poolToUse.length === 0) {
      return res.status(400).json({ error: 'No Codeforces problems found matching the selected rating range.' });
    }

    const shuffled = shuffleArray(poolToUse);
    const selectedProblems = shuffled.slice(0, Math.min(problemCount, shuffled.length));

    // Create new simulation document
    const simulation = new ContestSimulation({
      userId: req.user.id,
      startedAt: new Date(),
      durationMinutes: Number(durationMinutes),
      problemCount: selectedProblems.length,
      minRating: Number(minRating),
      maxRating: Number(maxRating),
      problems: selectedProblems,
      solvedCount: 0,
      completed: false
    });

    await simulation.save();
    res.json({ simulation, isExisting: false });

  } catch (err) {
    console.error('startSimulation Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/simulator/active - Get current active simulation
const getActiveSimulation = async (req, res) => {
  try {
    const active = await ContestSimulation.findOne({
      userId: req.user.id,
      completed: false
    });

    res.json({ activeSimulation: active || null });
  } catch (err) {
    console.error('getActiveSimulation Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/simulator/mark - Mark problem status during simulation
const markProblem = async (req, res) => {
  try {
    const { simulationId, problemId, status } = req.body; // status: 'solved', 'attempted', 'skipped', 'unsolved'
    if (!simulationId || !problemId || !status) {
      return res.status(400).json({ error: 'simulationId, problemId, and status are required' });
    }

    const sim = await ContestSimulation.findOne({
      _id: simulationId,
      userId: req.user.id,
      completed: false
    });

    if (!sim) {
      return res.status(404).json({ error: 'Active simulation not found' });
    }

    const targetProblem = sim.problems.find(p => p.problemId.toLowerCase() === problemId.toLowerCase());
    if (!targetProblem) {
      return res.status(404).json({ error: 'Problem not found in this simulation' });
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(sim.startedAt).getTime()) / 1000));
    targetProblem.status = status;
    targetProblem.markTimestamp = elapsedSeconds;

    await sim.save();
    res.json({ simulation: sim });

  } catch (err) {
    console.error('markProblem Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/simulator/finish - Finish simulation & cross-check real CF submissions
const finishSimulation = async (req, res) => {
  try {
    const { simulationId } = req.body;
    const sim = await ContestSimulation.findOne({
      _id: simulationId,
      userId: req.user.id
    });

    if (!sim) {
      return res.status(404).json({ error: 'Simulation session not found' });
    }

    const user = await User.findById(req.user.id);
    const cfHandle = user?.handles?.codeforces;

    const sessionStartMs = new Date(sim.startedAt).getTime();
    const sessionEndMs = Date.now();

    // Cross-check real Codeforces submissions if user has handle
    if (cfHandle) {
      try {
        const cfStatusRes = await axios.get(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(cfHandle)}&from=1&count=50`, { timeout: 7000 });
        if (cfStatusRes.data?.status === 'OK') {
          const subs = cfStatusRes.data.result || [];
          subs.forEach(sub => {
            const subMs = (sub.creationTimeSeconds || 0) * 1000;
            // Check if submission occurred during the simulation window (or up to 5 min after end)
            if (subMs >= sessionStartMs - 60000 && subMs <= sessionEndMs + 300000 && (sub.verdict === 'OK')) {
              const cfProblemId = `CF-${sub.problem?.contestId}${sub.problem?.index}`;
              const matchedProb = sim.problems.find(p => p.problemId.toLowerCase() === cfProblemId.toLowerCase());
              if (matchedProb) {
                matchedProb.status = 'solved';
                matchedProb.autoConfirmed = true;
                const elapsedSec = Math.max(0, Math.floor((subMs - sessionStartMs) / 1000));
                matchedProb.markTimestamp = elapsedSec;
              }
            }
          });
        }
      } catch (err) {
        console.log('[Simulator] CF status cross-check notice:', err.message);
      }
    }

    // Compute total solved count
    let solvedCount = 0;
    sim.problems.forEach(p => {
      if (p.status === 'solved') solvedCount++;
    });

    sim.solvedCount = solvedCount;
    sim.completed = true;
    sim.endedAt = new Date();

    await sim.save();
    res.json({ simulation: sim });

  } catch (err) {
    console.error('finishSimulation Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/simulator/history - Get past contest simulations & statistics
const getSimulationHistory = async (req, res) => {
  try {
    const history = await ContestSimulation.find({
      userId: req.user.id,
      completed: true
    }).sort({ startedAt: -1 });

    let totalRounds = history.length;
    let totalProblemsSolved = 0;
    let totalProblemsAssigned = 0;

    history.forEach(sim => {
      totalProblemsSolved += sim.solvedCount || 0;
      totalProblemsAssigned += sim.problemCount || 0;
    });

    const avgSolvedPerRound = totalRounds > 0 ? (totalProblemsSolved / totalRounds).toFixed(1) : 0;
    const overallSolveRate = totalProblemsAssigned > 0 ? Math.round((totalProblemsSolved / totalProblemsAssigned) * 100) : 0;

    res.json({
      history,
      stats: {
        totalRounds,
        totalProblemsSolved,
        totalProblemsAssigned,
        avgSolvedPerRound: Number(avgSolvedPerRound),
        overallSolveRate
      }
    });

  } catch (err) {
    console.error('getSimulationHistory Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  startSimulation,
  getActiveSimulation,
  markProblem,
  finishSimulation,
  getSimulationHistory
};
