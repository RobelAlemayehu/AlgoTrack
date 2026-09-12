const mongoose = require('mongoose');

const SimulationProblemSchema = new mongoose.Schema({
  problemId: { type: String, required: true },
  title: { type: String, required: true },
  platform: { type: String, default: 'Codeforces' },
  difficulty: { type: String },
  tags: [{ type: String }],
  url: { type: String, required: true },
  status: { type: String, enum: ['unsolved', 'solved', 'attempted', 'skipped'], default: 'unsolved' },
  markTimestamp: { type: Number, default: null }, // Seconds elapsed from session start
  autoConfirmed: { type: Boolean, default: false }
}, { _id: false });

const ContestSimulationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, required: true, default: Date.now },
  endedAt: { type: Date, default: null },
  durationMinutes: { type: Number, required: true },
  problemCount: { type: Number, required: true },
  minRating: { type: Number, required: true },
  maxRating: { type: Number, required: true },
  problems: [SimulationProblemSchema],
  solvedCount: { type: Number, default: 0 },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ContestSimulation', ContestSimulationSchema);
