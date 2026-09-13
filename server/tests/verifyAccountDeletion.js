const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const express = require('express');
const axios = require('axios');
const connectDB = require('../config/db');

const User = require('../models/User');
const Problem = require('../models/Problem');

const authRoutes = require('../routes/auth');
const adminRoutes = require('../routes/adminRoutes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

async function runVerification() {
  console.log('=== STARTING ACCOUNT SOFT-DELETION & ADMIN VISIBILITY TESTS ===\n');

  let server;
  const PORT = 5998;
  const baseURL = `http://127.0.0.1:${PORT}`;

  try {
    await connectDB();
    console.log('Connected to MongoDB for testing.');

    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
    console.log(`Test server running on port ${PORT}.\n`);

    const timestamp = Date.now();
    const deleteUsername = `testuser_del_${timestamp}`;
    const deleteEmail = `del_${timestamp}@example.com`;
    const deletePassword = 'password123';

    // 1. Register a test user
    console.log(`[TEST 1] Registering target account (${deleteUsername})...`);
    const regRes = await axios.post(`${baseURL}/api/auth/register`, {
      username: deleteUsername,
      email: deleteEmail,
      password: deletePassword
    });

    const userToken = regRes.data.token;
    const userId = regRes.data.user.id;
    console.log('✓ Account registered successfully.');

    // 2. Soft-delete the account
    console.log('\n[TEST 2] Soft-deleting account via DELETE /api/auth/account...');
    const delRes = await axios.delete(`${baseURL}/api/auth/account`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    console.log(`  DELETE /api/auth/account -> Status: ${delRes.status}, Message: "${delRes.data.msg}"`);
    if (delRes.status !== 200 || delRes.data.msg !== 'Account deleted successfully') {
      throw new Error('FAILURE: DELETE /api/auth/account did not return success!');
    }
    console.log('✓ ACCOUNT SOFT-DELETION REQUEST SUCCEEDED!');

    // 3. Verify Login is Blocked for Deleted User
    console.log('\n[TEST 3] Verifying login attempt with deleted credentials is blocked...');
    try {
      await axios.post(`${baseURL}/api/auth/login`, {
        email: deleteEmail,
        password: deletePassword
      });
      throw new Error('SECURITY FAILURE: Login succeeded for a deleted account!');
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.msg.includes('deleted')) {
        console.log(`  Login Status: ${err.response.status}, Message: "${err.response.data.msg}"`);
        console.log('✓ LOGIN PROPERLY BLOCKED FOR DELETED USER!');
      } else {
        throw new Error(`Unexpected error response during deleted user login: ${err.message}`);
      }
    }

    // 4. Verify Admin Can Still See Deleted User in Admin Users List
    console.log('\n[TEST 4] Verifying Admin Dashboard displays deleted account with isDeleted: true...');
    const adminUsername = `testuser_admin_del_${timestamp}`;
    const adminEmail = `admin_del_${timestamp}@example.com`;

    const adminUser = new User({
      username: adminUsername,
      email: adminEmail,
      password: 'password123',
      isAdmin: true,
      publicProfile: { enabled: true, slug: adminUsername, views: 0 }
    });
    await adminUser.save();

    const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    const adminUsersRes = await axios.get(`${baseURL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const foundDeletedUser = adminUsersRes.data.users.find(u => u.username === deleteUsername);
    if (!foundDeletedUser) {
      throw new Error('FAILURE: Deleted user was removed from admin users list!');
    }

    console.log('  Found Deleted User in Admin List:', {
      username: foundDeletedUser.username,
      isDeleted: foundDeletedUser.isDeleted,
      deletedAt: foundDeletedUser.deletedAt
    });

    if (foundDeletedUser.isDeleted !== true || !foundDeletedUser.deletedAt) {
      throw new Error('FAILURE: User isDeleted flag or deletedAt timestamp was missing in admin response!');
    }

    console.log('✓ DELETED USER IS KEPT IN DATABASE AND ACCESSIBLE TO ADMIN WITH isDeleted: true!');

    // Clean up test records
    await User.deleteMany({ _id: { $in: [userId, adminUser._id] } });
    console.log('\n✓ Cleaned up test data.');

    console.log('\n=== ALL ACCOUNT DELETION & ADMIN VISIBILITY TESTS PASSED! ===');

  } catch (err) {
    console.error('\n❌ ACCOUNT DELETION TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runVerification();
