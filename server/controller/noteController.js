const Problem = require('../models/Problem');

exports.updateNote = async (req, res) => {
    try {
        const { explanation, codeImplementation, codeImplmentation, complexity, category, usefulResources } = req.body;

        // Handle the historical typo — accept either spelling
        const code = codeImplementation || codeImplmentation || '';

        // Normalize complexity — accept string ("Time: O(n), Space: O(1)") or object
        let normalizedComplexity = { time: '', space: '' };
        if (complexity) {
            if (typeof complexity === 'string') {
                // Try to parse "Time: O(n)\nSpace: O(1)" or just store raw
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
        }

        const updatedProblem = await Problem.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            {
                $set: {
                    explanation: explanation || '',
                    codeImplementation: code,
                    complexity: normalizedComplexity,
                    category: category || 'General',
                    usefulResource: usefulResources || [],
                    lastUpdated: new Date()
                }
            },
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
        const problems = await Problem.find({ userId: req.user.id }).sort({ syncedAt: -1 });
        res.json(problems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};