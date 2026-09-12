const axios = require('axios');

async function testCfGym() {
  const handle = 'robelalemayehu';

  console.log('--- Testing without includeGym ---');
  try {
    const res = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100`, { family: 4, timeout: 15000 });
    console.log('Without includeGym count:', res.data?.result?.length);
  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n--- Testing WITH includeGym=true ---');
  try {
    let submissions = [];
    let from = 1;
    const count = 100;
    let hasMore = true;
    let pages = 0;

    while (hasMore && pages < 20) {
      console.log(`Fetching page ${pages + 1} (from=${from})...`);
      const res = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=${from}&count=${count}&includeGym=true`, { family: 4, timeout: 15000 });
      if (res.data.status !== 'OK') {
        console.log('Status not OK:', res.data);
        break;
      }
      const batch = res.data.result || [];
      console.log(`Batch size: ${batch.length}`);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        submissions.push(...batch);
        from += batch.length;
        pages++;
        if (batch.length < count) hasMore = false;
      }
    }

    console.log(`Total submissions with includeGym=true: ${submissions.length}`);
    const okSubs = submissions.filter(s => s.verdict === 'OK');
    console.log(`Total OK submissions: ${okSubs.length}`);

    const uniqueMap = new Map();
    okSubs.forEach(s => {
      const cId = s.problem.contestId || s.problem.problemsetName || 'GYM';
      const idx = s.problem.index || s.problem.name;
      const id = `${cId}-${idx}`;
      if (!uniqueMap.has(id)) {
        uniqueMap.set(id, { name: s.problem.name, id, contestId: s.problem.contestId, index: s.problem.index });
      }
    });
    console.log(`Unique AC problems with includeGym=true: ${uniqueMap.size}`);
    console.log('Sample problems:', Array.from(uniqueMap.values()).slice(0, 10));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testCfGym();
