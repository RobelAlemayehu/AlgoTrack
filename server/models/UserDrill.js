const mongoose = require('mongoose');

const UserDrillSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: String, required: true },
  title: { type: String, required: true },
  platform: { type: String, default: 'Codeforces' },
  tag: { type: String, required: true },
  difficulty: { type: String },
  completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserDrill', UserDrillSchema);
