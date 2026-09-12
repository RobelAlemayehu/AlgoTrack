const axios = require('axios');

async function testAllCfEndpoints() {
  const handle = 'robelalemayehu';

  // 1. user.info
  try {
    const res = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`, { family: 4 });
    console.log('user.info:', res.data.result[0]);
  } catch (err) {
    console.error('user.info error:', err.message);
  }

  // 2. user.rating
  try {
    const res = await axios.get(`https://codeforces.com/api/user.rating?handle=${handle}`, { family: 4 });
    console.log('user.rating count:', res.data.result?.length);
    console.log('user.rating contests:', res.data.result);
  } catch (err) {
    console.error('user.rating error:', err.message);
  }
}

testAllCfEndpoints();
