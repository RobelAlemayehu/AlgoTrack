const test = require('node:test');
const assert = require('node:assert/strict');
const { generateOTP, hashOTP, generateResetToken, verifyResetToken } = require('../utils/cryptoUtils');
const { getBrandedEmailTemplate } = require('../utils/emailService');

test('Crypto Utilities - OTP Generation & Hashing', () => {
  const code1 = generateOTP();
  const code2 = generateOTP();

  // Must be 6 digits
  assert.equal(typeof code1, 'string');
  assert.equal(code1.length, 6);
  assert.match(code1, /^\d{6}$/);

  assert.equal(typeof code2, 'string');
  assert.equal(code2.length, 6);
  assert.match(code2, /^\d{6}$/);

  // Hashing
  const hash1 = hashOTP(code1);
  const hash1Again = hashOTP(code1);
  const hash2 = hashOTP(code2);

  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 64); // SHA-256 hex string length
  assert.equal(hash1, hash1Again);
  assert.notEqual(hash1, hash2);
});

test('Crypto Utilities - Reset Token Sign & Verify', () => {
  const email = 'testuser@example.com';
  const token = generateResetToken(email);

  assert.equal(typeof token, 'string');

  const decoded = verifyResetToken(token);
  assert.equal(decoded.email, email);
  assert.equal(decoded.purpose, 'password_reset_authorized');
});

test('Branded Email Template HTML Generation', () => {
  const signupHtml = getBrandedEmailTemplate({
    purpose: 'signup_verification',
    otpCode: '123456',
    username: 'TestCoder'
  });

  assert.ok(signupHtml.includes('123456'));
  assert.ok(signupHtml.includes('Verify your email to start tracking your DSA progress'));
  assert.ok(signupHtml.includes('#09090b')); // Dark background
  assert.ok(signupHtml.includes('#f97316')); // Orange accent

  const resetHtml = getBrandedEmailTemplate({
    purpose: 'password_reset',
    otpCode: '654321',
    username: 'TestCoder'
  });

  assert.ok(resetHtml.includes('654321'));
  assert.ok(resetHtml.includes('Reset your AlgoTrack password'));
});
