const Problem = require('../models/Problem');

// Add manual problem record
exports.addManualProblem = async (req, res) => {
    try {
        const { title, platform, difficulty, tags, explanation, codeImplementation } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const problemId = `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const newProblem = new Problem({
            userId: req.user.id,
            problemId,
            title,
            platform: platform || 'Custom',
            difficulty: difficulty || 'Medium',
            tags: Array.isArray(tags) ? tags : [],
            explanation: explanation || '',
            codeImplementation: codeImplementation || '',
            solvedAt: new Date(),
            syncedAt: new Date(),
            source: 'manual',
            unverified: false
        });

        await newProblem.save();
        res.status(201).json(newProblem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get notes grouped by category (excluding archived)
exports.getNotesByCategory = async (req, res) => {
    try {
        const problems = await Problem.find({ userId: req.user.id, archived: { $ne: true } });

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

// Soft delete existing problems on handle change (safer handle change - 30d window)
exports.resetProblems = async (req, res) => {
    try {
        const result = await Problem.updateMany(
            { userId: req.user.id, archived: { $ne: true } },
            { $set: { archived: true, archivedAt: new Date() } }
        );
        res.json({ message: "Problems archived successfully", modifiedCount: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Permanently delete soft-deleted problems older than 30 days
exports.cleanupOldArchived = async (userId) => {
    try {
        const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await Problem.deleteMany({
            userId,
            archived: true,
            archivedAt: { $lte: THIRTY_DAYS_AGO }
        });
    } catch (err) {
        console.error('[Cleanup] Error deleting old archived problems:', err.message);
    }
};

// Get user's archived problems count & list
exports.getArchivedProblems = async (req, res) => {
    try {
        const archived = await Problem.find({ userId: req.user.id, archived: true }).sort({ archivedAt: -1 });
        res.json({ count: archived.length, problems: archived });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Restore archived problems
exports.restoreArchivedProblems = async (req, res) => {
    try {
        const result = await Problem.updateMany(
            { userId: req.user.id, archived: true },
            { $set: { archived: false, archivedAt: null } }
        );
        res.json({ message: "Problems restored successfully", restoredCount: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Export user problem data as JSON or CSV
exports.exportProblemData = async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const problems = await Problem.find({ userId: req.user.id, archived: { $ne: true } }).lean();

        if (format === 'csv') {
            const headers = ['Title', 'Platform', 'Problem ID', 'Difficulty', 'Category', 'Solved At', 'Synced At', 'Explanation'];
            const rows = problems.map(p => [
                `"${(p.title || '').replace(/"/g, '""')}"`,
                `"${p.platform}"`,
                `"${p.problemId || ''}"`,
                `"${p.difficulty}"`,
                `"${p.category || ''}"`,
                `"${p.solvedAt ? new Date(p.solvedAt).toISOString() : ''}"`,
                `"${p.syncedAt ? new Date(p.syncedAt).toISOString() : ''}"`,
                `"${(p.explanation || '').replace(/"/g, '""')}"`
            ]);
            const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=algotrack_problems.csv');
            return res.send(csvString);
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=algotrack_problems.json');
        res.json(problems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};