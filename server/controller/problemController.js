const Problem = require('../models/Problem');

exports.getNotesByCategory = async (req, res) => {
    try {
        const problems = await Problem.find({ userId: req.user.id })

        const library = problems.reduce((acc, prob) => {
            const cat = prob.category || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(prob);
            return acc;
        }, {});

        res.json(library);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resetProblems = async (req, res) => {
    try {
        await Problem.deleteMany({ userId: req.user.id });
        res.json({ message: "Problems reset successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};