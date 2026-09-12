const axios = require('axios');

async function testCfApi() {
  const handle = 'robelalemayehu';
  let submissions = [];
  let from = 1;
  const count = 50;
  let hasMore = true;
  let pages = 0;

  while (hasMore && pages < 50) {
    console.log(`Fetching page ${pages + 1}: from=${from}, count=${count}...`);
    try {
      const res = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=${from}&count=${count}`, { family: 4, timeout: 15000 });
      if (res.data.status !== 'OK') {
        console.log('CF status not OK:', res.data);
        break;
      }
      const batch = res.data.result || [];
      console.log(`Received batch length: ${batch.length}`);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        submissions.push(...batch);
        from += batch.length;
        pages++;
        if (batch.length < count) hasMore = false;
      }
    } catch (err) {
      console.error('Fetch error:', err.message);
      break;
    }
  }

  console.log(`Total submissions returned by API: ${submissions.length}`);
  const okSubs = submissions.filter(s => s.verdict === 'OK');
  console.log(`Total OK (Accepted) submissions: ${okSubs.length}`);

  const uniqueMap = new Map();
  okSubs.forEach(s => {
    const cId = s.problem.contestId || s.problem.problemsetName || 'GYM';
    const idx = s.problem.index || s.problem.name;
    const id = `${cId}-${idx}`;
    if (!uniqueMap.has(id)) {
      uniqueMap.set(id, { name: s.problem.name, id, contestId: s.problem.contestId, index: s.problem.index });
    }
  });

  console.log(`Total unique AC problems: ${uniqueMap.size}`);
}

testCfApi();
