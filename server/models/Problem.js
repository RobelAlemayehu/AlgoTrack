const mongoose = require('mongoose')

const problemSchema = new mongoose.Schema({
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

    notes: String,
    complexity: String,
    status:{
        type: String,
        default: 'Solved'
    },
},
    {timestamps:true}
)

module.exports = mongoose.model('Problem', problemSchema)
