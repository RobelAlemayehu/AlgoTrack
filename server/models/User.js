const mongoose = require('mongoose');

const UserShema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique:true
    },
    email:{
        type:String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true,
        minlength: 5
    },
    profilePic:{
        type: String,
        default:''
    },
    handles:{
        leetcode: {
            type: String,
            default:''
        },
        codeforces: {
            type: String,
            default:''
        }
    },
    createdAt:{
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model('User', UserShema);