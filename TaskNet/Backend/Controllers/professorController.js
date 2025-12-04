const Assignment = require('../Model/assignment');
const User = require('../Model/user');
const { uploadToCloudinary } = require('../config/cloudinary')
const { sendOTP, sendStudentNotification, sendSubmissionNotification, sendProfileUpdateOTP }= require('../util/emailSender')
const crypto= require('crypto')

module.exports.getProfessorDashboard = async (req, res) => {
    try{
        const professorId = req.user._id;
        const pendingAssignments = await Assignment.find({ 
            reviewerId: professorId, 
            status: { $in :['Submitted', 'Forwarded'] }
        })
        .populate('studentId', 'name email')
        .populate('departmentId', 'name')
        .sort({ submissionDate: 1 });

        const statusCounts = await Assignment.aggregate([
            { $match: { reviewerId: professorId } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const stats = {
            Pending: 0,
            Approved: 0,
            Rejected: 0,
            Total: 0
        };

        statusCounts.forEach(item => {
            if (item._id === 'Submitted' || item._id === 'Forwarded') stats.Pending = item.count;
            if (item._id === 'Approved') stats.Approved = item.count;
            if (item._id === 'Rejected') stats.Rejected = item.count;
            stats.Total += item.count;
        });

        const calculateDaysPending = (date) => {
            const now = new Date();
            const submitted = new Date(date);
            const diffTime = Math.abs(now - submitted);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            return diffDays;
        };

        res.render('professorDashboard', {
            user: req.user,
            stats: stats,
            assignments: pendingAssignments,
            calculateDaysPending: calculateDaysPending,
            activePage: 'dashboard'
        });

    } catch (error) {
        console.error("Error loading professor dashboard:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.getProfessorReviews = async(req,res)=> {
    try{
        const professorId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page- 1) *limit;
        const searchQuery = req.query.search || '';
        const statusFilter = req.query.status || 'All';
        const dateRange = req.query.dateRange || 'all';

        let query = { reviewerId: professorId };

        if(statusFilter !== 'All') {
            query.status = statusFilter;
        }

        if (searchQuery){
            query.$or = [
                { title: { $regex: searchQuery, $options: 'i' } },
                { 'studentId.name': { $regex: searchQuery, $options: 'i' } }
            ];
        }

        if(dateRange !== 'all') {
            const now = new Date();
            let startDate;
            switch(dateRange) {
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'quarter':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
            }
            query.submissionDate = { $gte: startDate };
        }

        const assignments = await Assignment.find(query)
            .populate('studentId', 'name email')
            .populate('departmentId', 'name')
            .sort({ submissionDate: -1 })
            .skip(skip)
            .limit(limit);

        const totalCount = await Assignment.countDocuments(query);
        const totalPages = Math.ceil(totalCount/limit);

        res.render('professorReviews', {
            user: req.user,
            assignments: assignments,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: searchQuery,
            statusFilter: statusFilter,
            dateRange: dateRange,
            activePage: 'reviews'
        });

    }catch(error) {
        console.error("Error loading professor reviews:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.getReviewPage=async(req,res)=>{
    try{
        const assignment = await Assignment.findById(req.params.id)
            .populate('studentId', 'name email departmentId')
            .populate('departmentId', 'name');

        if (!assignment){
            return res.status(404).send('Assignment not found');
        }

        const colleagues= await User.find({
            departmentId: req.user.departmentId,
            role: { $in: ['professor', 'HOD'] },
            _id: { $ne: req.user._id }
        }).select('name role')

        const courseInfo ={
            code: "25CS022", 
            name: `${assignment.departmentId.name} Core`
        };

        res.render('reviewAssignment', {
            user: req.user,
            assignment: assignment,
            colleagues: colleagues,
            courseInfo: courseInfo,
            activePage: 'dashboard'
        });

    }catch (error){
        console.error("Error loading review page:", error);
        res.status(500).send("Server Error");
    }
}

module.exports.processAssignmentReview = async(req, res)=> {
    try {
        const { action, remarks } = req.body;
        const assignment = await Assignment.findById(req.params.id).populate('studentId');

        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        if (action === 'Reject') {
            assignment.status = 'Rejected';
            assignment.history.push({
                action: 'Rejected',
                by: req.user.name,
                remark: remarks,
                timestamp: new Date()
            });
            await assignment.save();

            await sendStudentNotification({
                studentEmail: assignment.studentId.email,
                studentName: assignment.studentId.name,
                assignmentTitle: assignment.title,
                status: 'Rejected',
                professorName: req.user.name,
                remarks: remarks
            });
            return res.status(200).json({ success: true, message: 'Assignment rejected successfully.' });
        }

        if (action === 'Approve') {
            let signatureUrl = null;
            if (req.file) {
                try {
                    const uploadResult = await uploadToCloudinary(req.file, 'signature');
                    signatureUrl = uploadResult.url;
                } catch (uploadError) {
                    console.error('Cloudinary upload error:', uploadError);
                    return res.status(500).json({ success: false, message: 'Error uploading signature file.' });
                }
            }

            const otp = crypto.randomInt(100000, 999999).toString();
            const otpExpires = Date.now() + 10 * 60 * 1000;

            const professor = await User.findById(req.user._id);
            professor.otp = otp;
            professor.otpExpires = otpExpires;
            await professor.save();

            // Send email in background (don't await)
            sendOTP(professor.email, otp).catch(err => {
                console.error('Error sending OTP email:', err);
            });

            return res.status(200).json({ 
                success: true, 
                requireOtp: true, 
                message: 'OTP sent to your email.',
                tempData: {
                    signatureUrl: signatureUrl,
                    remarks: remarks
                }
            });
        }

    } catch(error) {
        console.error("Review processing error:", error);
        res.status(500).json({ success: false, message: 'Server error processing review.' });
    }
};


module.exports.verifyAndApprove = async(req, res)=> {
    try{
        const { otp, remarks, signatureUrl } = req.body;
        const professor = await User.findById(req.user._id).select('+otp +otpExpires');

        if (!professor.otp || professor.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
        if (professor.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP Expired' });
        }

        //otp clearr from databse 
        professor.otp = undefined;
        professor.otpExpires = undefined;
        await professor.save();

        const assignment = await Assignment.findById(req.params.id).populate('studentId');
        assignment.status = 'Approved';

        assignment.history.push({
            action: 'Approved',
            by: req.user.name,
            remark: remarks,
            timestamp: new Date(),
            fileUrl: signatureUrl
        });

        await assignment.save();

        await sendStudentNotification({
            studentEmail: assignment.studentId.email,
            studentName: assignment.studentId.name,
            assignmentTitle: assignment.title,
            status: 'Approved',
            professorName: req.user.name,
            remarks: remarks
        });
        return res.status(200).json({ success: true, message: 'Assignment approved successfully!' });

    } catch(error) {
        console.error("OTP Verification Error:", error);
        res.status(500).json({ success: false, message: 'Server error verifying OTP.' });
    }
};

module.exports.getProfessorProfile = async (req, res) => {
    try {
        const professorId = req.user._id;
        const assignments = await Assignment.find({ reviewerId: professorId });
        
        const stats = {
            total: assignments.length,
            approved: assignments.filter(a => a.status === 'Approved').length,
            pending: assignments.filter(a => a.status === 'Submitted').length,
            rejected: assignments.filter(a => a.status === 'Rejected').length
        };

        res.render('professorProfile', {
            user: req.user,
            stats: stats,
            activePage: 'profile'
        });
    } catch (error) {
        console.error('Error loading professor profile:', error);
        res.status(500).render('error', {
            message: 'Failed to load profile',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

module.exports.updateProfessorProfile = async(req, res) => {
    try{
        const { name, email, phone, specialization, office, department, address, city, state, postalCode } = req.body;
        const professorId = req.user._id;

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        const professor = await User.findById(professorId);
        professor.otp = otp;
        professor.otpExpires = otpExpires;
        professor.pendingProfileUpdate = {
            name,
            email,
            phone,
            specialization,
            office,
            department,
            address,
            city,
            state,
            postalCode
        };
        await professor.save();

        // Send email in background (don't await)
        sendProfileUpdateOTP(professor.email, otp).catch(err => {
            console.error('Error sending OTP email:', err);
        });

        return res.json({
            success: true,
            requireOtp: true,
            message: 'OTP sent to your email. Please verify to complete the profile update.'
        });

    } catch (error){
        console.error('Error updating professor profile:', error);
        res.status(500).json({ success: false, error: 'Failed to process profile update. Please try again.' });
    }
};

module.exports.verifyAndUpdateProfessorProfile = async(req, res) => {
    try{
        const { otp } = req.body;
        const professorId = req.user._id;

        const professor = await User.findById(professorId).select('+otp +otpExpires +pendingProfileUpdate');

        if (!professor.otp || professor.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (professor.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP Expired' });
        }

        if (!professor.pendingProfileUpdate) {
            return res.status(400).json({ success: false, message: 'No pending profile update found' });
        }

        const pendingUpdate = professor.pendingProfileUpdate;

        professor.name = pendingUpdate.name;
        professor.email = pendingUpdate.email;
        professor.phone = pendingUpdate.phone;
        professor.specialization = pendingUpdate.specialization;
        professor.office = pendingUpdate.office;
        professor.department = pendingUpdate.department;
        professor.address = pendingUpdate.address;
        professor.city = pendingUpdate.city;
        professor.state = pendingUpdate.state;
        professor.postalCode = pendingUpdate.postalCode;

        professor.otp = undefined;
        professor.otpExpires = undefined;
        professor.pendingProfileUpdate = undefined;
        
        await professor.save();

        return res.json({
            success: true,
            message: 'Profile updated successfully!'
        });

    } catch (error){
        console.error('Error verifying professor profile update:', error);
        return res.status(500).json({ success: false, message: 'Server error during verification.' });
    }
};

module.exports.resendProfileOTP = async (req, res) => {
    try {
        const professorId = req.user._id;
        const professor = await User.findById(professorId).select('+pendingProfileUpdate');

        if (!professor.pendingProfileUpdate) {
            return res.status(400).json({ success: false, message: 'No pending profile update. Please edit your profile first.' });
        }

        // Generate new OTP
        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + (10 * 60 * 1000); // 10 minutes

        professor.otp = otpCode;
        professor.otpExpires = otpExpires;

        await professor.save();
        await sendProfileUpdateOTP(professor.email, otpCode);

        return res.json({
            success: true,
            message: 'OTP resent to your email'
        });

    } catch (error) {
        console.error('Error resending OTP:', error);
        return res.status(500).json({ success: false, message: 'Failed to resend OTP' });
    }
};

module.exports.rejectAssignment= async(req,res)=>{
    try{
        const { remarks }= req.body;
        const assignmentId= req.params.id;
        if(!remarks || remarks.trim().length <10){
            return res.status(400).json({
                success: false,
                message: 'Rejection feedback is mandatory and must be atleast 10 characters long'
            })
        }

        const assignment= await Assignment.findById(assignmentId).populate('studentId');
        if(!assignment){
            return res.status(400).json({success: false, message: 'Assignment not found!'});
        }
        assignment.status= 'Rejected';
        assignment.history.push({
            action: 'Rejected',
            by: req.user.name,
            remark: remarks,
            timestamp: new Date()
        })
        await assignment.save();
        if(assignment.studentId){
            await sendStudentNotification({
                studentEmail: assignment.studentId.email,
                studentName: assignment.studentId.name,
                assignmentTitle: assignment.title,
                status: 'Rejected',
                professorName: req.user.name,
                remarks: remarks
            })
        }
        return res.status(200).json({
            success: true,
            message: 'Assignment rejected and returned to student.'
        })
    }
    catch(error){
        console.error("Rejection Error:", error);
        return res.status(500).json({ success: false, message: 'Server error during rejection.' });
    }
}

module.exports.forwardAssignment= async(req,res)=>{
    try{
        const { forwardToId, note } = req.body;
        const assignmentId= req.params.id;

        const assignment= await Assignment.findById(assignmentId).populate('studentId', 'name email');
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        assignment.reviewerId= forwardToId;
        assignment.status= 'Forwarded';
        assignment.history.push({
            action: 'Forwarded',
            by: req.user.name,
            forwardedTo: req.user.name,
            remark: note || 'Forwarded for further review',
            timestamp: new Date()
        })

        await assignment.save();
        
        const newReviewer= await User.findById(forwardToId);
        if(newReviewer){
            await sendSubmissionNotification({
                professorEmail: newReviewer.email,
                professorName: newReviewer.name,
                studentName: assignment.studentId.name,
                assignmentTitle: assignment.title,
                forwardedBy: req.user.name,
                note: note
            })
        }

        return res.status(200).json({ success: true, message: `Assignment forwarded to Dr. ${newReviewer.name}` })
    }
    catch(error){
        console.error('Error while forwarding assignment:', error);
        return res.status(500).json({ success: false, message: 'Server error during forwarding.' })
    }
}