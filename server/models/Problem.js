const mongoose = require('mongoose');

const complexitySchema = new mongoose.Schema({
    time: { type: String, default: '' },
    space: { type: String, default: '' }
}, { _id: false });

const problemSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        required: true
    },
    problemId: {
        type: String,
    },
    difficulty: {
        type: String,
        required: true
    },
    tags: [String],
    category: {
        type: String,
        default: 'General'
    },
    explanation: {
        type: String,
        default: ''
    },
    // Canonical spelling — codeImplementation
    codeImplementation: {
        type: String,
        default: ''
    },
    complexity: {
        type: complexitySchema,
        default: () => ({ time: '', space: '' })
    },
    usefulResource: [
        {
            label: String,
            url: String
        }
    ],
    syncedAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: 'Solved'
    },
},
    { timestamps: true }
);

problemSchema.index({ problemId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Problem', problemSchema);
