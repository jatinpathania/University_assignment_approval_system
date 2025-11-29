const mongoose= require('mongoose')

const departmentSchema= new mongoose.Schema({
    name:{
        type: String,
        required: true,
        unique: true,
        trim : true
    },
    programType:{
        type: String,
        required: true,
        enum: ['UG', 'PG', 'Research'],
        default: 'UG'
    },
    address:{
        type: String,
        required: true
    },
    shortCode:{
        type: String,
        sparse: true
    }
},{ timestamps: true} )

const Department= mongoose.model("Department", departmentSchema);
module.exports= Department