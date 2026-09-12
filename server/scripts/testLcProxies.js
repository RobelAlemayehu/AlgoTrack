const axios = require('axios');

async function testLcProxies() {
  const username = 'robel_al';

  const urls = [
    `https://alfa-leetcode-api.onrender.com/${username}/acSubmission`,
    `https://alfa-leetcode-api.onrender.com/acSubmission/${username}`,
    `https://leetcode-api-v2.vercel.app/${username}`,
    `https://leetcode-stats-api.herokuapp.com/${username}`,
    `https://leetcode-api-faisalshohag.vercel.app/${username}`
  ];

  for (const u of urls) {
    try {
      console.log(`Testing ${u}...`);
      const res = await axios.get(u, { timeout: 10000 });
      console.log('Result:', JSON.stringify(res.data).slice(0, 300));
    } catch (err) {
      console.log(`Failed (${u}):`, err.message);
    }
  }
}

testLcProxies();
