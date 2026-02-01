const axios = require('axios');
const Problem = require('../models/Problem');
const User = require('../models/User');

const syncLeetCode = async (req, res) => {
    try {

        const user = await User.findById(req.user.id);
        
        if (!user || !user.handles || !user.handles.leetcode) {
            return res.status(400).json({ msg: "Please set your Leetcode handle in settings first!" });
        }

        const leetcodeHandle = user.handles.leetcode;
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

        const response = await axios.post(url, query);
        const data = response.data.data;

        if (!data || !data.matchedUser) {
            return res.status(404).json({ error: "User not found or profile is private" });
        }

        const submissions = data.recentAcSubmissionList || [];
        
        const saved = await Promise.all(submissions.map(async (sub) => {
            return await Problem.findOneAndUpdate(
                { problemId: sub.titleSlug, userId: req.user.id }, 
                {
                    userId: req.user.id, 
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
            countSynced: saved.length 
        });

    } catch (error) {
        console.error("LeetCode Sync Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { syncLeetCode };