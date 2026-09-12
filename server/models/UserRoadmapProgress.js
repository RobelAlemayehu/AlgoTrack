const mongoose = require('mongoose');

const UserRoadmapProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  inProgressProblemIds: [{ type: String }],
  updatedAt: { type: Date, default: Date.now }
});

UserRoadmapProgressSchema.index({ userId: 1, roadmapId: 1 }, { unique: true });

module.exports = mongoose.model('UserRoadmapProgress', UserRoadmapProgressSchema);
