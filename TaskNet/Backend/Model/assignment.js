const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: false
    },
    category: {
        type: String,
        enum: ['Assignment', 'Thesis', 'Report'],
        required: true,
        default: 'Assignment'
    },
    courseCode: {
        type: String,
        required: false,
        trim: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Forwarded'],
        default: 'Draft'
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true 
    },
    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    history: [{
        action:{
            type: String,
            enum: ['Submitted', 'Approved', 'Rejected', 'Re-submitted', 'Forwarded'],
            required: true
        },
        by: {
            type: String,
            required: true
        },
        remark: {type: String, default: ''},
        timestamp: {type:Date, default: Date.now},
        fileUrl: {type: String}
    }],
    submissionDate: {
        type: Date,
        default: Date.now
    },
    fileUrl: {
        type: String
    },
    originalFileName: {
        type: String
    }
}, { timestamps: true });

const Assignment = mongoose.model("Assignment", assignmentSchema);
module.exports = Assignment;