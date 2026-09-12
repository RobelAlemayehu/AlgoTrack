const axios = require('axios');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

async function testGql() {
  const username = 'robel_al';

  // Test userProfileUserQuestionProgressV2 or userSessionProgress or userSubmissions
  const queries = [
    {
      name: 'userQuestionProgress',
      query: `query userQuestionProgress($userSlug: String!) {
        userProfileUserQuestionProgressV2(userSlug: $userSlug) {
          numAcceptedQuestions { difficulty count }
          numFailedQuestions { difficulty count }
          numUntouchedQuestions { difficulty count }
        }
      }`,
      variables: { userSlug: username }
    },
    {
      name: 'userProblemsSolved',
      query: `query userProblemsSolved($username: String!) {
        matchedUser(username: $username) {
          problemsSolvedBeatsStats {
            difficulty
            percentage
          }
          submitStats {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
        }
      }`,
      variables: { username }
    },
    {
      name: 'recentAcSubmissions',
      query: `query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
        }
      }`,
      variables: { username, limit: 50 }
    }
  ];

  for (const q of queries) {
    try {
      console.log(`Trying ${q.name}...`);
      const res = await axios.post('https://leetcode.com/graphql', {
        query: q.query,
        variables: q.variables
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': UA,
          'Referer': 'https://leetcode.com'
        },
        timeout: 10000
      });
      console.log(`${q.name} response:`, JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.error(`${q.name} error:`, err.message);
    }
  }
}

testGql();
