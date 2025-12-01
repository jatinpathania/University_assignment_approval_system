const mongoose= require('mongoose');
const bcrypt= require('bcryptjs')

const userSchema= new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone:{
        type: String,
        required: false
    },
    role: {
        type: String,
        enum: ['admin', 'professor', 'HOD', 'student'],
        default: "student"
    },
    departmentId :{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',     //linkk creatd
        required: false
    },
    otp:{
        type: String,
        select: false
    },
    otpExpires: {
        type: Date,
        select: false
    }
},{ timestamps: true })

//mongose middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});


const User= mongoose.model("User", userSchema);
module.exports= User