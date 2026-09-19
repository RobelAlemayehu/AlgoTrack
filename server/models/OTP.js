const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otpCodeHash: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['signup_verification', 'password_reset'],
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '10m' } // TTL index automatically cleans up expired OTP docs after 10 minutes
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('OTP', OTPSchema);
