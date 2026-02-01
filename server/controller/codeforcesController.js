const axios = require('axios');
const Problem = require('../models/Problem.js');
const User = require('../models/User');


const syncCodeforces = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const handle = user.codeforceHandle

        if(!handle){
            return res.staus(400).json({ msg: "Please set your Codeforce handle in setting first!"});
        }

        const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}`);


      
        const submissions = response.data.result;

        const uniqueSolved = new Map();

        submissions.forEach(sub => {
            if (sub.verdict === 'OK') {
                const id = `CF-${sub.problem.contestId}${sub.problem.index}`;
                if (!uniqueSolved.has(id)) {
                    uniqueSolved.set(id, {
                        problemId: id,
                        title: sub.problem.name,
                        platform: 'Codeforces',
                        difficulty: sub.problem.rating ? sub.problem.rating.toString() : 'Unrated',
                        syncedAt: new Date(sub.creationTimeSeconds * 1000)
                    });
                }
            }
        });

        const finalData = Array.from(uniqueSolved.values());

        const ops = finalData.map(prob => ({
            updateOne: {
                filter: { problemId: prob.problemId },
                update: { $set: prob },
                upsert: true
            }
        }));

        await Problem.bulkWrite(ops);

        res.status(200).json({ message: "CF Synced", count: finalData.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getProblems = async (req, res) => {
    try{
        const problems = await Problem.find().sort('-createdAt' );

        res.status(200).json(problems);


    }catch (error){
        res.status(500).json({ message: "Failed to fetch problems", error: error.message })
    }
}

module.exports = { syncCodeforces, getProblems };