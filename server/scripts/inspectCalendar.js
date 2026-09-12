require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function inspectCalendar() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('../models/User');

    const user = await User.findOne({ username: 'rovel_19' });
    console.log('lcCalendar keys count:', Object.keys(user.lcCalendar || {}).length);

    const entries = Object.entries(user.lcCalendar || {}).map(([ts, count]) => ({
      ts: Number(ts),
      date: new Date(Number(ts) * 1000).toISOString().slice(0, 10),
      count
    })).sort((a, b) => b.ts - a.ts);

    console.log('Sample lcCalendar active dates (newest first):');
    console.log(entries.slice(0, 15));
    console.log('Sample lcCalendar active dates (oldest first):');
    console.log(entries.slice(-15));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectCalendar();
