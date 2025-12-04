const User= require('../Model/user')
const Assignment= require('../Model/assignment')
const { uploadToCloudinary } = require('../config/cloudinary')
const { sendSubmissionNotification, sendProfileUpdateOTP }= require('../util/emailSender')
const https = require('https')
const http = require('http')
const crypto = require('crypto')

module.exports.getStudentDashboard = async (req, res) => {
    try{
        const studentId= req.user._id;
        const statusCounts= await Assignment.aggregate([
            { $match: { studentId: studentId } },
            { $group: { _id: "$status" , count: { $sum : 1 } } }
        ])
        const stats = {
            Draft: 0,
            Submitted: 0,
            Approved: 0,
            Rejected: 0
        };
        statusCounts.forEach(item => {
            if (stats.hasOwnProperty(item._id)) {
                stats[item._id] = item.count;
            }
        });

        const recentAssignments= await Assignment.find({studentId: studentId}).sort({updatedAt: -1}).limit(5)     //most recent update
        res.render('studentDashboard', {
            user: req.user,
            stats: stats,
            recentAssignments: recentAssignments,
            activePage: 'dashboard'
        });
    }
        catch(error){
        console.error('Error loading student dashboard:', error);
        res.status(500).render('error', {
            message: 'Failed to load dashboard',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

module.exports.getUploadAssignmentForm= (req,res)=>{
    res.render('uploadAssignment', {
        user: req.user,
        errors: {},
        formData: {},
        successMessage: null,
        activePage: 'submit'
    });
}


module.exports.uploadAssignment = async (req, res) => {
    const { title, description, category, courseCode } = req.body;
    if (!req.file) {
        return res.status(400).render('uploadAssignment', {
            user: req.user,
            errors: { file: 'Please upload a valid PDF file.' },
            formData: req.body,
            successMessage: null,
            activePage: 'submit'
        });
    }

    let errors = {};
    if (!title) errors.title = 'Title is required.';
    if (!category) errors.category = 'Category is required.';
    if (!courseCode) errors.courseCode = 'Course Code is required.';

    if (Object.keys(errors).length > 0) {
        return res.status(400).render('uploadAssignment', {
            user: req.user,
            errors: errors,
            formData: req.body,
            successMessage: null,
            activePage: 'submit'
        });
    }

    try {
        const student = await User.findById(req.user._id); 
        if (!student.departmentId) {
             return res.status(400).render('uploadAssignment', {
                user: req.user,
                errors: { general: 'You are not assigned to a department. Cannot submit.' },
                formData: req.body,
                successMessage: null,
                activePage: 'submit'
            });
        }

        const cloudinaryResult= await uploadToCloudinary(req.file);

        const newAssignment = new Assignment({
            title,
            description,
            category,
            courseCode,
            studentId: req.user._id,
            departmentId: student.departmentId,
            fileUrl: cloudinaryResult.url,
            originalFileName: req.file.originalname,
            status: 'Draft' 
        });

        await newAssignment.save();

        res.render('uploadAssignment', {
            user: req.user,
            errors: {},
            formData: {},
            successMessage: `Assignment '${title}' uploaded successfully! (ID: ${newAssignment._id})`,
            activePage: 'submit'
        });

    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).render('uploadAssignment', {
            user: req.user,
            errors: { general: 'Database error during submission.' },
            formData: req.body,
            successMessage: null,
            activePage: 'submit'
        });
    }
};

module.exports.getBulkUploadForm =(req, res)=> {
    res.render('bulkUpload', {
        user: req.user,
        errors: {},
        formData: {},
        successMessage: null,
        uploadedAssignments: null,
        activePage: 'submit'
    });
};


module.exports.bulkUploadAssignments = async (req, res) => {
    const { title, description, category, courseCode } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).render('bulkUpload', {
            user: req.user,
            errors: { file: 'Please select at least one PDF file.' },
            formData: req.body,
            successMessage: null,
            uploadedAssignments: null,
            activePage: 'submit'
        });
    }

    let errors = {};
    if (!title) errors.title = 'Common Title is required.';
    if (!category) errors.category = 'Category is required.';
    if (!courseCode) errors.courseCode = 'Course Code is required.';

    if (Object.keys(errors).length > 0) {
        return res.status(400).render('bulkUpload', {
            user: req.user,
            errors: errors,
            formData: req.body,
            successMessage: null,
            uploadedAssignments: null,
            activePage: 'submit'
        });
    }

    try {
        const student = await User.findById(req.user._id);
        if (!student.departmentId) {
             return res.status(400).render('bulkUpload', {
                user: req.user,
                errors: { general: 'You are not assigned to a department.' },
                formData: req.body,
                successMessage: null,
                uploadedAssignments: null,
                activePage: 'submit'
            });
        }

        const uploadedAssignments = [];

        const uploadPromises = req.files.map(async (file, index) => {
            const cloudinaryResult = await uploadToCloudinary(file);
            const distinctTitle = req.files.length > 1 ? `${title} (Part ${index + 1})` : title;

            const newAssignment = new Assignment({
                title: distinctTitle,
                description: description,
                category: category,
                courseCode: courseCode,
                studentId: req.user._id,
                departmentId: student.departmentId,
                fileUrl: cloudinaryResult.url,
                originalFileName: file.originalname,
                status: 'Draft' 
            });

            return newAssignment.save();
        });

        const results = await Promise.all(uploadPromises);

        res.render('bulkUpload', {
            user: req.user,
            errors: {},
            formData: {},
            successMessage: `Successfully uploaded ${results.length} assignments!`,
            uploadedAssignments: results,
            activePage: 'submit'
        });

    } catch (error) {
        console.error("Bulk Upload error:", error);
        res.status(500).render('bulkUpload', {
            user: req.user,
            errors: { general: 'Error processing bulk upload. Some files may not have saved.' },
            formData: req.body,
            successMessage: null,
            uploadedAssignments: null,
            activePage: 'submit'
        });
    }
};


module.exports.getAllAssignments = async (req, res) => {
    try {
        const studentId = req.user._id;
        const statusFilter = req.query.status || 'All';
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        let query = { studentId: studentId };
        if (statusFilter !== 'All') {
            query.status = statusFilter;
        }

        const assignments = await Assignment.find(query)
            .populate('departmentId', 'name')
            .populate('reviewerId', 'name')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCount = await Assignment.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        const student = await User.findById(studentId);
        const professors = await User.find({ 
            departmentId: student.departmentId,
            role: { $in: ['professor', 'HOD'] } 
        }).select('name email');

        res.render('myAssignments', {
            user: req.user,
            assignments: assignments,
            professors: professors,
            activePage: 'assignments',
            filterStatus: statusFilter,
            currentPage: page,
            totalPages: totalPages,
            successMessage: null
        });

    } catch (error) {
        console.error("Error fetching assignments:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.submitAssignment =async(req,res)=> {
    try{
        const assignmentId = req.params.id;
        const { reviewerId } = req.body;

        if(!reviewerId){
            return res.status(400).json({ success: false, message: 'Please select a professor.' });
        }

        const assignment = await Assignment.findOne({ _id: assignmentId, studentId: req.user._id });

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found.' });
        }

        if (assignment.status !== 'Draft') {
            return res.status(400).json({ success: false, message: 'Only drafts can be submitted.' });
        }

        assignment.status = 'Submitted';
        assignment.reviewerId = reviewerId;
        assignment.submissionDate = new Date();

        assignment.history.push({
            action: 'Submitted',
            by: req.user.name,
            remark: 'Submitted for review',
            timestamp: new Date(),
            fileUrl: assignment.fileUrl
        })

        await assignment.save();

        //Email notification
        const professor = await User.findById(reviewerId);
        if (professor) {
            await sendSubmissionNotification({
                professorEmail: professor.email,
                professorName: professor.name,
                studentName: req.user.name,
                assignmentTitle: assignment.title
            });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Assignment submitted successfully for review!' 
        });

    } catch(error){
        console.error("Submission error:", error);
        return res.status(500).json({ success: false, message: 'Server error during submission.' });
    }
};


module.exports.getAssignmentDetails = async(req, res)=>{
    try{
        const assignmentId = req.params.id;
        const assignment = await Assignment.findOne({ _id: assignmentId,studentId: req.user._id })
            .populate('departmentId', 'name')
            .populate('reviewerId', 'name role email');

        if(!assignment){
            return res.status(404).send("Assignment not found");
        }

        const student = await User.findById(req.user._id);
        const professors = await User.find({ 
            departmentId: student.departmentId,
            role: { $in: ['professor', 'HOD'] } 
        }).select('name email _id');

        res.render('assignmentDetails', {
            user: req.user,
            assignment: assignment,
            professors: professors,
            activePage: 'assignments'
        });

    } catch (error) {
        console.error("Error fetching assignment details:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.downloadAssignment = async(req,res) =>{
    try{
        const assignment = await Assignment.findOne({ _id: req.params.id, studentId: req.user._id });
        if(!assignment) return res.status(404).send("File not found");

        const fileUrl = assignment.fileUrl;
        const filename = assignment.originalFileName;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        const protocol = fileUrl.startsWith('https') ? https : http;
        protocol.get(fileUrl, (remoteRes) => {
            remoteRes.pipe(res);
        }).on('error', (err) => {
            console.error('Error downloading file from Cloudinary:', err);
            res.status(500).send("Error downloading file");
        });
    } catch(error){
        console.error('Download error:', error);
        res.status(500).send("Error downloading file");
    }
};

module.exports.resubmitAssignment =async(req, res)=> {
    try{
        const assignmentId = req.params.id;
        const { description, reviewerId } = req.body;
        
        const assignment = await Assignment.findOne({ _id: assignmentId, studentId: req.user._id });
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
        
        if (assignment.status !== 'Rejected') {
            return res.status(400).json({ success: false, message: 'Only rejected assignments can be resubmitted.' });
        }
        let currentFileUrl = assignment.fileUrl;
        let currentOriginalName = assignment.originalFileName;

        if(req.file) {
            try {
                const cloudinaryResult = await uploadToCloudinary(req.file);
                currentFileUrl = cloudinaryResult.url;
                currentOriginalName = req.file.originalname;
            } catch (uploadError) {
                console.error("Cloudinary upload error:", uploadError);
                return res.status(400).json({ success: false, message: 'Error uploading file to cloud storage.' });
            }
        }

        assignment.status = 'Submitted';
        assignment.submissionDate = new Date();
        assignment.fileUrl = currentFileUrl;
        assignment.originalFileName = currentOriginalName;
        if (description) assignment.description = description;

        let historyRemark = 'Addressing feedback';
        if (reviewerId && reviewerId !== assignment.reviewerId.toString()) {
            const newProfessor = await User.findById(reviewerId);
            historyRemark = `Resubmitted to Dr. ${newProfessor.name} for review`;
            assignment.reviewerId = reviewerId;
        }

        assignment.history.push({
            action: 'Re-submitted',
            by: req.user.name,
            remark: historyRemark,
            timestamp: new Date(),
            fileUrl: currentFileUrl
        });

        await assignment.save();

        // Send email notification
        if (assignment.reviewerId) {
            try {
                const professor = await User.findById(assignment.reviewerId);
                if (professor) {
                    await sendSubmissionNotification({
                        professorEmail: professor.email,
                        professorName: professor.name,
                        studentName: req.user.name,
                        assignmentTitle: `${assignment.title} (Resubmission)`
                    });
                }
            } catch (emailError) {
                console.error("Email notification error:", emailError);
            }
        }

        return res.status(200).json({ success: true, message: 'Assignment resubmitted successfully! Your professor will review it shortly.' });
    } catch (error) {
        console.error("Resubmission error:", error);
        return res.status(500).json({ success: false, message: 'Server error during resubmission. Please try again.' });
    }
};

module.exports.getStudentProfile = async (req, res) => {
    try {
        const studentId = req.user._id;
        const assignments = await Assignment.find({ studentId: studentId });
        
        const stats = {
            total: assignments.length,
            approved: assignments.filter(a => a.status === 'Approved').length,
            pending: assignments.filter(a => a.status === 'Submitted').length,
            rejected: assignments.filter(a => a.status === 'Rejected').length
        };

        res.render('studentProfile', {
            user: req.user,
            stats: stats,
            activePage: 'profile'
        });
    } catch (error) {
        console.error('Error loading student profile:', error);
        res.status(500).render('error', {
            message: 'Failed to load profile',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

module.exports.updateStudentProfile = async (req, res) => {
    try {
        const { name, email, rollNumber, phone, address, city, state, postalCode } = req.body;
        const studentId = req.user._id;

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        const student = await User.findById(studentId);
        student.otp = otp;
        student.otpExpires = otpExpires;
        student.pendingProfileUpdate = {
            name,
            email,
            rollNumber,
            phone,
            address,
            city,
            state,
            postalCode
        };
        await student.save();

        // Send email in background (don't await)
        sendProfileUpdateOTP(student.email, otp).catch(err => {
            console.error('Error sending OTP email:', err);
        });

        return res.json({
            success: true,
            requireOtp: true,
            message: 'OTP sent to your email. Please verify to complete the profile update.'
        });

    } catch (error) {
        console.error('Error updating student profile:', error);
        res.status(500).json({ success: false, error: 'Failed to process profile update. Please try again.' });
    }
};

module.exports.verifyAndUpdateStudentProfile = async (req, res) => {
    try{
        const { otp } = req.body;
        const studentId = req.user._id;

        const student = await User.findById(studentId).select('+otp +otpExpires +pendingProfileUpdate');

        if(!student.otp || student.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if(student.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP Expired' });
        }

        if (!student.pendingProfileUpdate) {
            return res.status(400).json({ success: false, message: 'No pending profile update found' });
        }

        const pendingUpdate = student.pendingProfileUpdate;

        student.name = pendingUpdate.name;
        student.email = pendingUpdate.email;
        student.rollNumber = pendingUpdate.rollNumber;
        student.phone = pendingUpdate.phone;
        student.address = pendingUpdate.address;
        student.city = pendingUpdate.city;
        student.state = pendingUpdate.state;
        student.postalCode = pendingUpdate.postalCode;

        student.otp = undefined;
        student.otpExpires = undefined;
        student.pendingProfileUpdate = undefined;
        
        await student.save();

        return res.json({
            success: true,
            message: 'Profile updated successfully!'
        });

    } catch (error) {
        console.error('Error verifying student profile update:', error);
        return res.status(500).json({ success: false, message: 'Server error during verification.' });
    }
};

module.exports.resendProfileOTP = async (req, res) => {
    try {
        const studentId = req.user._id;
        const student = await User.findById(studentId).select('+pendingProfileUpdate');

        if (!student.pendingProfileUpdate) {
            return res.status(400).json({ success: false, message: 'No pending profile update. Please edit your profile first.' });
        }

        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + (10 * 60 * 1000); // 10 minutes

        student.otp = otpCode;
        student.otpExpires = otpExpires;

        await student.save();
        await sendProfileUpdateOTP(student.email, otpCode);

        return res.json({
            success: true,
            message: 'OTP resent to your email'
        });

    } catch (error) {
        console.error('Error resending OTP:', error);
        return res.status(500).json({ success: false, message: 'Failed to resend OTP' });
    }
};