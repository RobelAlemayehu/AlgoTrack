const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/User');
const OTP = require('../models/OTP');
const authRoutes = require('../routes/auth');
const { hashOTP } = require('../utils/cryptoUtils');

let app;
let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/algotrack_test';
    await mongoose.connect(uri);
  }

  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Cleanup test user & OTP records
  await User.deleteMany({ email: /@testotp\.com$/i });
  await OTP.deleteMany({ email: /@testotp\.com$/i });
  await mongoose.disconnect();
});

test('Integration - Signup, Unverified Login Block, OTP Verification & Login', async () => {
  const testEmail = `user_${Date.now()}@testotp.com`;
  const testPassword = 'Password123!';
  const testUsername = `user_${Date.now()}`;

  // 1. Register User
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, email: testEmail, password: testPassword })
  });
  const regData = await regRes.json();
  assert.equal(regRes.status, 200);
  assert.equal(regData.requiresVerification, true);
  assert.equal(regData.email, testEmail.toLowerCase());

  // Confirm user in DB has emailVerified = false
  const dbUser = await User.findOne({ email: testEmail.toLowerCase() });
  assert.ok(dbUser);
  assert.equal(dbUser.emailVerified, false);

  // 2. Unverified Login Attempt (should be blocked with 403 & requiresVerification)
  const loginBlockRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginBlockData = await loginBlockRes.json();
  assert.equal(loginBlockRes.status, 403);
  assert.equal(loginBlockData.requiresVerification, true);

  // 3. Find OTP created in DB for test email
  const otpDoc = await OTP.findOne({ email: testEmail.toLowerCase(), purpose: 'signup_verification' });
  assert.ok(otpDoc);
  assert.equal(otpDoc.attempts, 0);

  // 4. Verify OTP with incorrect code -> expect failure & attempts increment
  const wrongVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: '000000', purpose: 'signup_verification' })
  });
  const wrongVerifyData = await wrongVerifyRes.json();
  assert.equal(wrongVerifyRes.status, 400);
  assert.ok(wrongVerifyData.msg.includes('Invalid verification code'));

  const updatedOtpDoc = await OTP.findOne({ email: testEmail.toLowerCase(), purpose: 'signup_verification' });
  assert.equal(updatedOtpDoc.attempts, 1);

  // 5. Verify OTP with correct code by inserting known hash for test
  const testCode = '654321';
  updatedOtpDoc.otpCodeHash = hashOTP(testCode);
  await updatedOtpDoc.save();

  const correctVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: testCode, purpose: 'signup_verification' })
  });
  const correctVerifyData = await correctVerifyRes.json();
  assert.equal(correctVerifyRes.status, 200);
  assert.ok(correctVerifyData.token);
  assert.equal(correctVerifyData.user.emailVerified, true);

  // Confirm user in DB is now verified
  const verifiedUser = await User.findOne({ email: testEmail.toLowerCase() });
  assert.equal(verifiedUser.emailVerified, true);

  // OTP record should be deleted after successful verification
  const deletedOtp = await OTP.findOne({ email: testEmail.toLowerCase() });
  assert.equal(deletedOtp, null);

  // 6. Normal Login should now succeed
  const loginSuccessRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginSuccessData = await loginSuccessRes.json();
  assert.equal(loginSuccessRes.status, 200);
  assert.ok(loginSuccessData.token);
});

test('Integration - Forgot Password & Reset Flow', async () => {
  const testEmail = `forgot_${Date.now()}@testotp.com`;
  const oldPassword = 'OldPassword123!';
  const newPassword = 'NewPassword456!';
  const testUsername = `forgot_${Date.now()}`;

  // Pre-create verified user
  const salt = await require('bcryptjs').genSalt(10);
  const hashedPassword = await require('bcryptjs').hash(oldPassword, salt);
  await new User({
    username: testUsername,
    email: testEmail.toLowerCase(),
    password: hashedPassword,
    emailVerified: true
  }).save();

  // 1. Request Password Reset OTP
  const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, purpose: 'password_reset' })
  });
  const sendData = await sendRes.json();
  assert.equal(sendRes.status, 200);
  assert.ok(sendData.msg.includes('verification code has been sent'));

  // 2. Set known hash on OTP doc
  const otpDoc = await OTP.findOne({ email: testEmail.toLowerCase(), purpose: 'password_reset' });
  assert.ok(otpDoc);

  const resetCode = '112233';
  otpDoc.otpCodeHash = hashOTP(resetCode);
  await otpDoc.save();

  // 3. Verify OTP for password reset
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: resetCode, purpose: 'password_reset' })
  });
  const verifyData = await verifyRes.json();
  assert.equal(verifyRes.status, 200);
  assert.ok(verifyData.resetToken);

  // 4. Submit Reset Password with new password
  const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      resetToken: verifyData.resetToken,
      newPassword
    })
  });
  const resetData = await resetRes.json();
  assert.equal(resetRes.status, 200);
  assert.ok(resetData.msg.includes('Password reset successful'));

  // 5. Try logging in with old password (should fail)
  const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: oldPassword })
  });
  assert.equal(oldLoginRes.status, 400);

  // 6. Try logging in with new password (should succeed)
  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: newPassword })
  });
  const newLoginData = await newLoginRes.json();
  assert.equal(newLoginRes.status, 200);
  assert.ok(newLoginData.token);
});
