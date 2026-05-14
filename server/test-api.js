const axios = require('axios');

// Test Codeforces API directly
async function testCodeforces() {
    console.log('Testing Codeforces API with user: tourist');
    try {
        const response = await axios.get('https://codeforces.com/api/user.status?handle=tourist');
        const submissions = response.data.result;
        const solvedCount = new Set(submissions.filter(s => s.verdict === 'OK').map(s => s.problem.name)).size;
        console.log('✓ Codeforces API works!');
        console.log(`  Found ${solvedCount} unique solved problems for tourist`);
        return true;
    } catch (error) {
        console.log('✗ Codeforces API failed:', error.message);
        return false;
    }
}

// Test LeetCode API directly
async function testLeetCode() {
    console.log('\nTesting LeetCode API with user: tmwilliamlin168');
    try {
        const url = "https://leetcode.com/graphql";
        const query = {
            query: `
            query getUserProfile($username: String!, $limit: Int!) {
                recentAcSubmissionList(username: $username, limit: $limit) {
                    title
                    titleSlug
                    timestamp
                }
                matchedUser(username: $username) {
                    submitStatsGlobal {
                        acSubmissionNum {
                            difficulty
                            count
                        }
                    }
                }
            }`,
            variables: { username: 'tmwilliamlin168', limit: 100 }
        };

        const response = await axios.post(url, query);
        const data = response.data.data;

        if (data && data.matchedUser) {
            console.log('✓ LeetCode API works!');
            console.log(`  Found ${data.recentAcSubmissionList.length} submissions for tmwilliamlin168`);
            return true;
        } else {
            console.log('✗ LeetCode returned no user data');
            return false;
        }
    } catch (error) {
        console.log('✗ LeetCode API failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('=== Testing External APIs ===\n');
    await testCodeforces();
    await testLeetCode();
    console.log('\n=== Tests Complete ===');
}

main();
