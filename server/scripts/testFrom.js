const axios = require('axios');

async function testFrom() {
  const handle = 'robelalemayehu';
  const offsets = [1, 25, 45, 49, 50, 51, 60, 70];

  for (const from of offsets) {
    try {
      const res = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=${from}&count=10`, { family: 4, timeout: 10000 });
      const batch = res.data?.result || [];
      console.log(`from=${from}, count=10 -> returned ${batch.length} items`);
      if (batch.length > 0) {
        console.log(`  First item in batch: ID=${batch[0].id}, name=${batch[0].problem?.name}, verdict=${batch[0].verdict}`);
      }
    } catch (err) {
      console.error(`from=${from} error:`, err.message);
    }
  }
}

testFrom();
