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
    status: {
        type: String,
        enum: ['Draft', 'Submitted', 'Approved', 'Rejected'],
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