const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const express = require('express');
const axios = require('axios');

const User = require('../models/User');
const SyncLog = require('../models/SyncLog');
const Problem = require('../models/Problem');

const connectDB = require('../config/db');

const syncRoutes = require('../routes/syncRoutes');
const authRoutes = require('../routes/auth');
const adminRoutes = require('../routes/adminRoutes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/admin', adminRoutes);

async function runVerification() {
  console.log('=== STARTING ADMIN DASHBOARD ACCESS-CONTROL & INTEGRITY TESTS ===\n');

  let server;
  const PORT = 5999;
  const baseURL = `http://127.0.0.1:${PORT}`;

  try {
    await connectDB();
    console.log('Connected to MongoDB for testing.');

    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
    console.log(`Test server running on port ${PORT}.\n`);

    // 1. Create a non-admin test user
    const timestamp = Date.now();
    const nonAdminUsername = `testuser_nonadmin_${timestamp}`;
    const nonAdminEmail = `nonadmin_${timestamp}@example.com`;
    
    const nonAdminUser = new User({
      username: nonAdminUsername,
      email: nonAdminEmail,
      password: 'hashedpassword123',
      isAdmin: false,
      publicProfile: { enabled: true, slug: nonAdminUsername, views: 0 }
    });
    await nonAdminUser.save();

    const nonAdminToken = jwt.sign({ id: nonAdminUser._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    console.log(`[TEST 1] Testing Access Control for Non-Admin User (${nonAdminUsername})...`);

    const checkNonAdminStatus = async (path) => {
      try {
        await axios.get(`${baseURL}${path}`, {
          headers: { Authorization: `Bearer ${nonAdminToken}` }
        });
        return 200;
      } catch (err) {
        return err.response ? err.response.status : 500;
      }
    };

    const statusUsersNonAdmin = await checkNonAdminStatus('/api/admin/users');
    console.log(`  GET /api/admin/users -> Status: ${statusUsersNonAdmin} (Expected: 403)`);

    const statusHealthNonAdmin = await checkNonAdminStatus('/api/admin/sync-health');
    console.log(`  GET /api/admin/sync-health -> Status: ${statusHealthNonAdmin} (Expected: 403)`);

    const statusStatsNonAdmin = await checkNonAdminStatus('/api/admin/stats');
    console.log(`  GET /api/admin/stats -> Status: ${statusStatsNonAdmin} (Expected: 403)`);

    if (statusUsersNonAdmin !== 403 || statusHealthNonAdmin !== 403 || statusStatsNonAdmin !== 403) {
      throw new Error('SECURITY FAILURE: Non-admin user was not rejected with 403 status code!');
    }
    console.log('✓ NON-ADMIN REJECTED WITH 403 FORBIDDEN ACROSS ALL ADMIN ROUTES!\n');

    // 2. Create an admin test user (set directly in DB)
    const adminUsername = `testuser_admin_${timestamp}`;
    const adminEmail = `admin_${timestamp}@example.com`;

    const adminUser = new User({
      username: adminUsername,
      email: adminEmail,
      password: 'supersecretpassword123',
      isAdmin: true,
      publicProfile: { enabled: true, slug: adminUsername, views: 0 },
      handles: { leetcode: 'admin_lc', codeforces: 'admin_cf' }
    });
    await adminUser.save();

    const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    console.log(`[TEST 2] Testing Access & Data Retrieval for Admin User (${adminUsername})...`);

    // Create a dummy SyncLog & Problem for test verification
    await SyncLog.create({
      userId: nonAdminUser._id,
      platform: 'leetcode',
      status: 'failure',
      errorMessage: 'Test error message for telemetry verification'
    });

    await Problem.create({
      userId: adminUser._id,
      problemId: `test-prob-${timestamp}`,
      title: 'Test Problem',
      platform: 'LeetCode',
      difficulty: 'Easy'
    });

    const resUsersAdmin = await axios.get(`${baseURL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`  GET /api/admin/users -> Status: ${resUsersAdmin.status} (Expected: 200)`);

    const resHealthAdmin = await axios.get(`${baseURL}/api/admin/sync-health`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`  GET /api/admin/sync-health -> Status: ${resHealthAdmin.status} (Expected: 200)`);

    const resStatsAdmin = await axios.get(`${baseURL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`  GET /api/admin/stats -> Status: ${resStatsAdmin.status} (Expected: 200)`);

    if (resUsersAdmin.status !== 200 || resHealthAdmin.status !== 200 || resStatsAdmin.status !== 200) {
      throw new Error('FAILURE: Admin user was rejected or encountered an error fetching admin routes!');
    }
    console.log('✓ ADMIN ALLOWED WITH 200 OK ACROSS ALL ADMIN ROUTES!\n');

    // 3. Security Check: Sensitive Field Leakage Inspection
    console.log('[TEST 3] Inspecting Data Payload for Sensitive Fields (passwords, refreshTokens, secrets)...');
    const usersBodyString = JSON.stringify(resUsersAdmin.data);
    const healthBodyString = JSON.stringify(resHealthAdmin.data);
    const statsBodyString = JSON.stringify(resStatsAdmin.data);

    const fullPayloadString = usersBodyString + healthBodyString + statsBodyString;

    const containsPasswordHash = fullPayloadString.includes('hashedpassword123') || fullPayloadString.includes('supersecretpassword123') || fullPayloadString.includes('"password"');
    const containsRefreshToken = fullPayloadString.includes('"refreshToken"');
    const containsLcSession = fullPayloadString.includes('"lcSession"');

    console.log(`  Contains Password Hashes/Fields: ${containsPasswordHash}`);
    console.log(`  Contains Refresh Tokens: ${containsRefreshToken}`);
    console.log(`  Contains LC Session Cookies: ${containsLcSession}`);

    if (containsPasswordHash || containsRefreshToken || containsLcSession) {
      throw new Error('SECURITY FAILURE: Sensitive user fields were found in admin response payload!');
    }
    console.log('✓ NO SENSITIVE FIELDS OR PASSWORDS EXPOSED IN ANY RESPONSE!\n');

    // 4. Verify Payload Details
    console.log('[TEST 4] Verifying Payload Details:');
    console.log('  Users count:', resUsersAdmin.data.users.length);
    console.log('  Sample User Payload:', resUsersAdmin.data.users[0]);
    console.log('  Sync Health 24h:', resHealthAdmin.data.syncs24h);
    console.log('  Recent Failures count:', resHealthAdmin.data.recentFailures.length);
    console.log('  Stats Payload:', resStatsAdmin.data);

    // Cleanup test records
    await User.deleteMany({ _id: { $in: [nonAdminUser._id, adminUser._id] } });
    await SyncLog.deleteMany({ userId: nonAdminUser._id });
    await Problem.deleteMany({ userId: adminUser._id });
    console.log('\n✓ Cleaned up test data.');

    console.log('\n=== ALL ACCESS CONTROL & TELEMETRY VERIFICATION TESTS PASSED SUCCESSFULLY! ===');

  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runVerification();
