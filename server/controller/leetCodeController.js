const axios = require('axios');
const Problem = require('../models/Problem');
const User = require('../models/User');


const syncLeetCode = async (req, res) => {

    const user = await User.findById(res.user.id);
    const usernleetcodeHandleame = user.handles.leetcode; 

    if(!leetcodeHandle){
        return res.status(400).json({ msg: "Please set your Leetcode handle in setting first!" });
    }
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
        variables: { username: leetcodeHandle, limit: 3000 } 
    };

    try {
        const response = await axios.post(url, query);
        const data = response.data.data;

        if (!data || !data.matchedUser) {
            return res.status(404).json({ error: "User not found or profile is private" });
        }

        const submissions = data.recentAcSubmissionList || [];
        console.log(`Fetched ${submissions.length} items from LeetCode`);

        const saved = await Promise.all(submissions.map(async (sub) => {
            return await Problem.findOneAndUpdate(
                { problemId: sub.titleSlug },
                {
                    title: sub.title,
                    platform: "LeetCode",
                    difficulty: "Medium",
                    syncedAt: new Date(sub.timestamp * 1000)
                },
                { upsert: true, new: true }
            );
        }));

        res.json({ 
            message: "LeetCode Synced!", 
            countInDB: saved.length,
            totalOnProfile: data.matchedUser.submitStatsGlobal.acSubmissionNum[0].count 
        });
    } catch (error) {
        console.error("LeetCode Sync Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { syncLeetCode };