const axios = require('axios');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

async function testLcApi() {
  const username = 'robel_al';

  // 1. Fetch profile stats
  try {
    const res = await axios.post('https://leetcode.com/graphql', {
      query: `
        query lcProfile($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum { difficulty count }
            }
          }
        }`,
      variables: { username }
    }, { headers: { 'User-Agent': UA, 'Content-Type': 'application/json' }, timeout: 15000 });

    const acNums = res.data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
    console.log('LC Profile Stats for robel_al:', acNums);
  } catch (err) {
    console.error('LC Profile fetch error:', err.message);
  }

  // 2. Try alfa-leetcode-api
  try {
    const res = await axios.get(`https://alfa-leetcode-api.onrender.com/${username}/acSubmission?limit=100`, { timeout: 15000 });
    const subs = res.data?.submission || res.data || [];
    console.log(`alfa-leetcode-api returned ${subs.length} AC submissions`);
  } catch (err) {
    console.error('alfa-leetcode-api error:', err.message);
  }

  // 3. Try recentSubmissions
  try {
    const res = await axios.post('https://leetcode.com/graphql', {
      query: `query recentSubmissions($username: String!, $limit: Int!) {
        recentSubmissionList(username: $username, limit: $limit) {
          id title titleSlug timestamp statusDisplay
        }
      }`,
      variables: { username, limit: 50 }
    }, { headers: { 'User-Agent': UA, 'Content-Type': 'application/json' }, timeout: 15000 });

    const recent = res.data?.data?.recentSubmissionList || [];
    console.log(`recentSubmissionList returned ${recent.length} submissions`);
    const acRecent = recent.filter(s => s.statusDisplay === 'Accepted');
    console.log(`Accepted in recentSubmissionList: ${acRecent.length}`);
  } catch (err) {
    console.error('recentSubmissionList error:', err.message);
  }
}

testLcApi();
