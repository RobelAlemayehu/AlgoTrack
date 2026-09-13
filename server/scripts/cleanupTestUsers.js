const mongoose = require('mongoose');
const User = require('../models/User');
const SyncLog = require('../models/SyncLog');
const Problem = require('../models/Problem');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const testUsers = await User.find({
      $or: [
        { username: /^testuser_/ },
        { email: /@example\.com$/ }
      ]
    });

    const testUserIds = testUsers.map(u => u._id);

    const userRes = await User.deleteMany({
      $or: [
        { username: /^testuser_/ },
        { email: /@example\.com$/ }
      ]
    });

    const logRes = await SyncLog.deleteMany({
      $or: [
        { userId: { $in: testUserIds } },
        { errorMessage: /Test error message/ }
      ]
    });

    const probRes = await Problem.deleteMany({
      $or: [
        { userId: { $in: testUserIds } },
        { problemId: /^test-prob-/ }
      ]
    });

    console.log('✓ Cleaned up test data from MongoDB:');
    console.log(`  - Removed ${userRes.deletedCount} test user(s)`);
    console.log(`  - Removed ${logRes.deletedCount} test sync log(s)`);
    console.log(`  - Removed ${probRes.deletedCount} test problem(s)`);

  } catch (err) {
    console.error('Error during cleanup:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();
