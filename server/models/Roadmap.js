const mongoose = require('mongoose');

const RoadmapSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  problems: [
    {
      title: { type: String, required: true },
      platform: { type: String, enum: ['LeetCode', 'Codeforces'], default: 'LeetCode' },
      problemId: { type: String, required: true },
      difficulty: { type: String, default: 'Medium' },
      tags: [{ type: String }],
      category: { type: String, required: true },
      order: { type: Number, default: 0 }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Roadmap', RoadmapSchema);
