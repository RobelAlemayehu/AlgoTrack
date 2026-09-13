const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './server/.env' });

const User = require('../models/User');
const authRoutes = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

async function runTest() {
  console.log('=== STARTING ONBOARDING WIZARD VERIFICATION TEST ===\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const PORT = 5997;
    const server = app.listen(PORT, async () => {
      console.log(`Test server running on port ${PORT}.\n`);

      try {
        const timestamp = Date.now();
        const testUser = {
          username: `testuser_onb_${timestamp}`,
          email: `onboarding_${timestamp}@example.com`,
          password: 'Password123!'
        };

        // 1. Register new user
        console.log('[TEST 1] Registering new user...');
        const regRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testUser)
        });

        const regData = await regRes.json();
        console.log(`  Register Status: ${regRes.status}`);
        console.log(`  hasCompletedOnboarding in register response: ${regData.user?.hasCompletedOnboarding}`);

        if (regData.user?.hasCompletedOnboarding !== false) {
          throw new Error('Expected hasCompletedOnboarding to be false for new registered user');
        }
        console.log('✓ NEW USER CREATED WITH hasCompletedOnboarding: false\n');

        const token = regData.token;

        // 2. Fetch Profile
        console.log('[TEST 2] Fetching user profile before onboarding completion...');
        const profRes = await fetch(`http://localhost:${PORT}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profData = await profRes.json();
        console.log(`  Profile hasCompletedOnboarding: ${profData.hasCompletedOnboarding}`);
        if (profData.hasCompletedOnboarding !== false) {
          throw new Error('Expected profile hasCompletedOnboarding to be false');
        }
        console.log('✓ GET /api/auth/profile PROPERLY RETURNS hasCompletedOnboarding: false\n');

        // 3. Mark Onboarding as Complete
        console.log('[TEST 3] Updating onboarding status via PUT /api/auth/onboarding...');
        const onbRes = await fetch(`http://localhost:${PORT}/api/auth/onboarding`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ completed: true })
        });
        const onbData = await onbRes.json();
        console.log(`  PUT /api/auth/onboarding Status: ${onbRes.status}, Message: "${onbData.msg}"`);
        console.log(`  hasCompletedOnboarding: ${onbData.hasCompletedOnboarding}`);

        if (!onbRes.ok || onbData.hasCompletedOnboarding !== true) {
          throw new Error('Failed to update onboarding status to true');
        }
        console.log('✓ PUT /api/auth/onboarding SUCCEEDED & SET STATUS TO true\n');

        // 4. Verify Profile now returns hasCompletedOnboarding: true
        console.log('[TEST 4] Re-fetching profile to confirm persistence...');
        const profRes2 = await fetch(`http://localhost:${PORT}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profData2 = await profRes2.json();
        console.log(`  Updated Profile hasCompletedOnboarding: ${profData2.hasCompletedOnboarding}`);
        if (profData2.hasCompletedOnboarding !== true) {
          throw new Error('Expected updated profile hasCompletedOnboarding to be true');
        }
        console.log('✓ PERSISTED ONBOARDING STATUS VERIFIED AS true IN PROFILE!\n');

        // Cleanup
        await User.deleteOne({ email: testUser.email });
        console.log('✓ Cleaned up test user.\n');
        console.log('=== ALL ONBOARDING WIZARD TESTS PASSED SUCCESSFULLY! ===');

        server.close();
        await mongoose.disconnect();
        process.exit(0);

      } catch (err) {
        console.error('❌ Test failed:', err.message);
        await User.deleteOne({ email: `onboarding_${timestamp}@example.com` }).catch(() => {});
        server.close();
        await mongoose.disconnect();
        process.exit(1);
      }
    });

  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
}

runTest();
