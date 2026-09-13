const mongoose = require('mongoose');

const SyncLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: ['leetcode', 'codeforces'],
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    required: true
  },
  errorMessage: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

SyncLogSchema.index({ timestamp: -1 });
SyncLogSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('SyncLog', SyncLogSchema);
