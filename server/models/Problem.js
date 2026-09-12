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
    solvedAt: {
        type: Date,
        default: Date.now
    },
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
    // Spaced Repetition (SM-2 Algorithm)
    review: {
        enabled:      { type: Boolean, default: false },
        nextReviewAt: { type: Date, default: null },
        interval:     { type: Number, default: 1 },     // in days
        easeFactor:   { type: Number, default: 2.5 },   // SM-2 default
        repetitions:  { type: Number, default: 0 },
        lastRating:   { type: String, enum: ['again', 'hard', 'good', 'easy'], default: null }
    },
    // Soft Delete (Safer Handle Changes - 30 day recovery)
    archived: {
        type: Boolean,
        default: false
    },
    archivedAt: {
        type: Date,
        default: null
    },
    unverified: {
        type: Boolean,
        default: false
    },
    source: {
        type: String,
        enum: ['sync', 'manual'],
        default: 'sync'
    },
    revealedHintTier: {
        type: String,
        enum: ['none', 'nudge', 'approach', 'solution'],
        default: 'none'
    }
},
    { timestamps: true }
);


problemSchema.index({ problemId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Problem', problemSchema);
