const Problem = require('../models/Problem');

exports.updateNote = async (req, res) => {
    try {
        const { explanation, codeImplementation, codeImplmentation, complexity, category, usefulResources, status } = req.body;

        // Handle the historical typo — accept either spelling
        const code = codeImplementation || codeImplmentation || '';

        const updateData = { lastUpdated: new Date() };
        if (explanation !== undefined) updateData.explanation = explanation;
        if (code || codeImplementation !== undefined || codeImplmentation !== undefined) {
            updateData.codeImplementation = code;
        }
        if (complexity !== undefined) {
            let normalizedComplexity = { time: '', space: '' };
            if (typeof complexity === 'string') {
                const timeMatch = complexity.match(/time[:\s]+([^\n]+)/i);
                const spaceMatch = complexity.match(/space[:\s]+([^\n]+)/i);
                normalizedComplexity = {
                    time: timeMatch ? timeMatch[1].trim() : complexity,
                    space: spaceMatch ? spaceMatch[1].trim() : ''
                };
            } else if (typeof complexity === 'object') {
                normalizedComplexity = {
                    time: complexity.time || '',
                    space: complexity.space || ''
                };
            }
            updateData.complexity = normalizedComplexity;
        }
        if (category !== undefined) updateData.category = category;
        if (usefulResources !== undefined) updateData.usefulResource = usefulResources;
        if (status !== undefined) updateData.status = status;

        const updatedProblem = await Problem.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { $set: updateData },
            { new: true, upsert: false }
        );

        if (!updatedProblem) return res.status(404).json({ msg: 'Note not found' });

        return res.json(updatedProblem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getNotes = async (req, res) => {
    try {
        const problems = await Problem.find({ userId: req.user.id, archived: { $ne: true } }).sort({ solvedAt: -1, syncedAt: -1 });
        res.json(problems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateHintTier = async (req, res) => {
    try {
        const { tier } = req.body;
        const validTiers = ['none', 'nudge', 'approach', 'solution'];
        if (!tier || !validTiers.includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier specified' });
        }

        const tierRanks = { none: 0, nudge: 1, approach: 2, solution: 3 };

        const problem = await Problem.findOne({ _id: req.params.id, userId: req.user.id });
        if (!problem) return res.status(404).json({ error: 'Problem not found' });

        const currentRank = tierRanks[problem.revealedHintTier || 'none'] || 0;
        const newRank = tierRanks[tier];

        // Only upgrade hint tier rank (never downgrade user reflection tier)
        if (newRank > currentRank) {
            problem.revealedHintTier = tier;
            await problem.save();
        }

        return res.json(problem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};