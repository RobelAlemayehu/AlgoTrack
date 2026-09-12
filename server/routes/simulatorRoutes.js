const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  startSimulation,
  getActiveSimulation,
  markProblem,
  finishSimulation,
  getSimulationHistory
} = require('../controller/simulatorController');

router.post('/start', auth, startSimulation);
router.get('/active', auth, getActiveSimulation);
router.post('/mark', auth, markProblem);
router.post('/finish', auth, finishSimulation);
router.get('/history', auth, getSimulationHistory);

module.exports = router;
