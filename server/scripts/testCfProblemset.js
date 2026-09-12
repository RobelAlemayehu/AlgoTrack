const axios = require('axios');

async function testCfProblemset() {
  try {
    const res = await axios.get('https://codeforces.com/api/problemset.problems?tags=dp', { family: 4, timeout: 10000 });
    if (res.data.status === 'OK') {
      const probs = res.data.result.problems || [];
      console.log(`Fetched ${probs.length} problems for tag "dp"`);
      console.log('Sample problems:', probs.slice(0, 5).map(p => ({ contestId: p.contestId, index: p.index, name: p.name, rating: p.rating, tags: p.tags })));

      const iskander = probs.find(p => p.name.toLowerCase().includes('iskander'));
      const zeroSum = probs.find(p => p.name.toLowerCase().includes('zero sum'));
      console.log('Found Iskander?', iskander);
      console.log('Found Zero Sum?', zeroSum);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testCfProblemset();
