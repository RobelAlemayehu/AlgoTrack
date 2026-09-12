require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function testRecommendEndpoint() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('../models/User');
    const Problem = require('../models/Problem');

    const user = await User.findOne({ username: 'rovel_19' });
    const req = { user: { id: user._id } };
    let jsonResult = null;
    const res = {
      json: (data) => { jsonResult = data; return data; },
      status: (code) => ({ json: (data) => { jsonResult = data; return data; } })
    };

    const { getRecommendations } = require('../controller/recommendController');
    await getRecommendations(req, res);

    console.log('CF Recommendations count:', jsonResult?.cfRecommendations?.length);
    console.log('Sample CF Recommendations:', jsonResult?.cfRecommendations?.slice(0, 5));
    console.log('LC Recommendations:', jsonResult?.lcRecommendations);
    console.log('Weak Tags:', jsonResult?.weakTags);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

testRecommendEndpoint();
