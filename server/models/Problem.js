const mongoose = require('mongoose')
const User = require('../models/User.js')

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
        unique: true
    },
    difficulty:{
        type: String,
        required: true
    },
    tags:[String],

    category:{
        type: String,
        default:'General'
    },
    explanation: {
        type: String,
        default: ''
    },

    codeImplementation:{
        type: String,
        default: ''
    },   
    
    complexity: {
        time:{
            type: String,
            default: ''
        },
        space:{
            type: String,
            default: ''
        }

    },
    usefulResource:[
        {
            label: String,
            url: String
        }
    ],

    lastUpdated:{
        type: Date,
        default: Date.now
    },

    status:{
        type: String,
        default: 'Solved'
    },
},
    {timestamps:true}
)

module.exports = mongoose.model('Problem', problemSchema)
