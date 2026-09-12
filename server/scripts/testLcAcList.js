const axios = require('axios');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

async function testLcAcList() {
  const username = 'robel_al';

  // Query 1: recentAcSubmissionList
  try {
    const res = await axios.post('https://leetcode.com/graphql', {
      query: `query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
        }
      }`,
      variables: { username, limit: 20 }
    }, {
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json',
        'Referer': `https://leetcode.com/u/${username}/`
      },
      timeout: 10000
    });

    console.log('recentAcSubmissionList response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('recentAcSubmissions error:', err.message);
  }

  // Query 2: userProfileUserQuestionProgressV2
  try {
    const res = await axios.post('https://leetcode.com/graphql', {
      query: `query userRecentAc($username: String!) {
        recentACSubmissions(username: $username) {
          submissionId
          submitTime
          question {
            title
            titleSlug
            translatedTitle
            questionId
            questionFrontendId
          }
        }
      }`,
      variables: { username }
    }, {
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json',
        'Referer': `https://leetcode.com/u/${username}/`
      },
      timeout: 10000
    });
    console.log('recentACSubmissions response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('recentACSubmissions error:', err.message);
  }
}

testLcAcList();
