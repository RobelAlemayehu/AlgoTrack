const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Generate a cryptographically secure 6-digit numeric OTP string.
 */
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash an OTP code using HMAC-SHA256 with server secret.
 * Raw codes are never logged or stored.
 */
function hashOTP(code) {
  if (!code) return '';
  const secret = process.env.JWT_SECRET || 'algotrack_secret_key';
  return crypto.createHmac('sha256', secret).update(String(code)).digest('hex');
}

/**
 * Generate a short-lived password reset token (15 minute expiration).
 */
function generateResetToken(email) {
  const secret = process.env.JWT_SECRET || 'algotrack_secret_key';
  return jwt.sign(
    { email, purpose: 'password_reset_authorized' },
    secret,
    { expiresIn: '15m' }
  );
}

/**
 * Verify password reset token. Returns decoded payload or throws error.
 */
function verifyResetToken(token) {
  const secret = process.env.JWT_SECRET || 'algotrack_secret_key';
  const decoded = jwt.verify(token, secret);
  if (decoded.purpose !== 'password_reset_authorized') {
    throw new Error('Invalid reset token purpose');
  }
  return decoded;
}

module.exports = {
  generateOTP,
  hashOTP,
  generateResetToken,
  verifyResetToken
};
