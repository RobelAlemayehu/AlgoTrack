const axios = require('axios');

async function testExtra() {
  const handle = 'robelalemayehu';

  // Test 1: alfa-leetcode-api or codeforces proxies if any
  const urls = [
    `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=1000`,
    `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=500&includeGym=true`,
    `https://codeforces-api.vercel.app/user/${handle}`,
    `https://codeforces.com/api/user.submissions?handle=${handle}`,
  ];

  for (const url of urls) {
    try {
      console.log(`Testing ${url}...`);
      const res = await axios.get(url, { family: 4, timeout: 8000 });
      console.log('Success!', res.data?.status || res.status, typeof res.data === 'object' ? Object.keys(res.data) : res.data.slice(0, 100));
    } catch (err) {
      console.log('Failed:', err.message);
    }
  }
}

testExtra();
