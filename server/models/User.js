const mongoose = require('mongoose');

const complexitySchema = new mongoose.Schema({
  time:  { type: String, default: '' },
  space: { type: String, default: '' }
}, { _id: false });

const lcStatsSchema = new mongoose.Schema({
  easy:    { type: Number, default: 0 },
  medium:  { type: Number, default: 0 },
  hard:    { type: Number, default: 0 },
  total:   { type: Number, default: 0 },
  ranking: { type: Number, default: 0 }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true, minlength: 5 },
  profilePic:{ type: String, default: '' },
  handles: {
    leetcode:   { type: String, default: '' },
    codeforces: { type: String, default: '' }
  },
  // LeetCode aggregate data (from matchedUser + userCalendar)
  lcStats:    { type: lcStatsSchema, default: () => ({}) },
  lcCalendar: { type: Object, default: {} }, // { "1700000000": 3, ... } unix_ts -> count
  // Codeforces profile
  cfRating:   { type: Number, default: 0 },
  cfMaxRating:{ type: Number, default: 0 },
  cfRank:     { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);