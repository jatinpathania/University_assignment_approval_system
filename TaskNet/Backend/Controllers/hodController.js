const Assignment = require('../Model/assignment');
const User = require('../Model/user');
const Department = require('../Model/department');
const { sendStudentNotification, sendProfileUpdateOTP } = require('../util/emailSender');
const crypto = require('crypto');

module.exports.getHodDashboard = async (req,res) => {
    try{
        const hodId = req.user._id;
        const departmentId = req.user.departmentId;

        const department = await Department.findById(departmentId);
        const totalAssignments = await Assignment.countDocuments({ departmentId });
        
        const statusCounts = await Assignment.aggregate([
            { $match: { departmentId } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const stats = {
            Total: totalAssignments,
            Submitted: 0,
            Approved: 0,
            Rejected: 0,
            Forwarded: 0,
            Draft: 0
        };

        statusCounts.forEach(item => {
            if (stats.hasOwnProperty(item._id)) {
                stats[item._id] = item.count;
            }
        });

        const departmentStats = await Assignment.aggregate([
            { $match: { departmentId } },
            {
                $group: {
                    _id: null,
                    totalAssignments: { $sum: 1 },
                    approvalRate: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Approved"] }, 1, 0]
                        }
                    },
                    rejectionRate: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        let performanceMetrics = {
            approvalRate: 0,
            rejectionRate: 0,
            pendingRate: 0
        };

        if (departmentStats.length > 0) {
            const dept = departmentStats[0];
            performanceMetrics.approvalRate = dept.totalAssignments > 0 ? ((dept.approvalRate / dept.totalAssignments) * 100).toFixed(2) : 0;
            performanceMetrics.rejectionRate = dept.totalAssignments > 0 ? ((dept.rejectionRate / dept.totalAssignments) * 100).toFixed(2) : 0;
            performanceMetrics.pendingRate = dept.totalAssignments > 0 ? (((stats.Submitted + stats.Forwarded) / dept.totalAssignments) * 100).toFixed(2) : 0;
        }

        const recentAssignments = await Assignment.find({ departmentId })
            .populate('studentId', 'name email')
            .populate('reviewerId', 'name role')
            .sort({ updatedAt: -1 })
            .limit(5);

        const professorCount = await User.countDocuments({
            departmentId,
            role: 'professor'
        });

        const studentCount = await User.countDocuments({
            departmentId,
            role: 'student'
        });

        res.render('hodDashboard', {
            user: req.user,
            department: department,
            stats: stats,
            performanceMetrics: performanceMetrics,
            recentAssignments: recentAssignments,
            professorCount: professorCount,
            studentCount: studentCount,
            activePage: 'dashboard'
        });

    } catch (error) {
        console.error("Error loading HOD dashboard:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.getProfessorOversight = async (req,res) => {
    try{
        const departmentId =req.user.departmentId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page -1) * limit;
        const searchQuery = req.query.search || '';

        let query ={ departmentId, role: 'professor' };

        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const professors = await User.find(query)
            .select('_id name email phone departmentId')
            .limit(limit)
            .skip(skip);

        const totalCount = await User.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        const professorsWithMetrics = await Promise.all(
            professors.map(async (prof) => {
                const assignments = await Assignment.find({ reviewerId: prof._id });
                return {
                    ...prof.toObject(),
                    metrics: {
                        total: assignments.length,
                        approved: assignments.filter(a => a.status === 'Approved').length,
                        rejected: assignments.filter(a => a.status === 'Rejected').length,
                        pending: assignments.filter(a => a.status === 'Submitted' || a.status === 'Forwarded').length
                    }
                };
            })
        );

        res.render('professorOversight', {
            user: req.user,
            professors: professorsWithMetrics,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: searchQuery,
            activePage: 'professors'
        });

    } catch (error) {
        console.error("Error loading professor oversight:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.getProfessorDetail = async (req, res) => {
    try{
        const professorId = req.params.id;
        const departmentId = req.user.departmentId;

        const professor = await User.findOne({
            _id: professorId,
            departmentId,
            role: 'professor'
        });

        if (!professor) {
            return res.status(404).send('Professor not found');
        }

        const assignments = await Assignment.find({ reviewerId: professorId, departmentId })
            .populate('studentId', 'name email')
            .sort({ updatedAt: -1 });

        const stats = {
            total: assignments.length,
            approved: assignments.filter(a => a.status === 'Approved').length,
            rejected: assignments.filter(a => a.status === 'Rejected').length,
            pending: assignments.filter(a => a.status === 'Submitted' || a.status === 'Forwarded').length
        };


        let totalReviewTime = 0;
        let reviewedCount = 0;
        assignments.forEach(assignment => {
            if (assignment.status === 'Approved' || assignment.status === 'Rejected') {
                const submissionDate = new Date(assignment.submissionDate);
                const updateDate = new Date(assignment.updatedAt);
                totalReviewTime += (updateDate - submissionDate) / (1000 * 60 * 60);
                reviewedCount++;
            }
        });

        const avgReviewTime = reviewedCount > 0 ? (totalReviewTime / reviewedCount).toFixed(2) : 0;

        res.render('professorDetailView', {
            user: req.user,
            professor: professor,
            assignments: assignments,
            stats: stats,
            avgReviewTime: avgReviewTime,
            activePage: 'professors'
        });

    } catch (error) {
        console.error("Error loading professor details:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.getDepartmentAnalytics = async (req, res) => {
    try {
        const departmentId = req.user.departmentId;
        const dateRange = req.query.dateRange || 'month';

        let startDate;
        const now = new Date();

        switch (dateRange) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'quarter':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(0);
        }

        const timelineData = await Assignment.aggregate([
            {
                $match: {
                    departmentId,
                    submissionDate: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$submissionDate" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const statusDistribution = await Assignment.aggregate([
            { $match: { departmentId, submissionDate: { $gte: startDate } } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const categoryDistribution = await Assignment.aggregate([
            { $match: { departmentId, submissionDate: { $gte: startDate } } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        const professorPerformance = await Assignment.aggregate([
            { $match: { departmentId, submissionDate: { $gte: startDate } } },
            {
                $group: {
                    _id: "$reviewerId",
                    total: { $sum: 1 },
                    approved: {
                        $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] }
                    },
                    rejected: {
                        $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] }
                    }
                }
            }
        ]);

        const professorPerformanceWithNames = await Promise.all(
            professorPerformance.map(async (perf) => {
                const prof = await User.findById(perf._id).select('name');
                return {
                    professorName: prof ? prof.name : 'Unknown',
                    ...perf
                };
            })
        );

        res.render('departmentAnalytics', {
            user: req.user,
            timelineData: JSON.stringify(timelineData),
            statusDistribution: JSON.stringify(statusDistribution),
            categoryDistribution: JSON.stringify(categoryDistribution),
            professorPerformance: JSON.stringify(professorPerformanceWithNames),
            dateRange: dateRange,
            activePage: 'analytics'
        });

    } catch (error) {
        console.error("Error loading department analytics:", error);
        res.status(500).send("Internal Server Error");
    }
};


module.exports.getDepartmentAssignments = async (req, res) => {
    try {
        const departmentId = req.user.departmentId;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || '';
        const statusFilter = req.query.status || 'All';
        const categoryFilter = req.query.category || 'All';

        let query = { departmentId };

        if (statusFilter !== 'All') {
            query.status = statusFilter;
        }

        if (categoryFilter !== 'All') {
            query.category = categoryFilter;
        }

        if (searchQuery) {
            query.$or = [
                { title: { $regex: searchQuery, $options: 'i' } },
                { courseCode: { $regex: searchQuery, $options: 'i' } },
                { 'studentId.name': { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const assignments = await Assignment.find(query)
            .populate('studentId', 'name email')
            .populate('reviewerId', 'name role')
            .sort({ submissionDate: -1 })
            .skip(skip)
            .limit(limit);

        const totalCount = await Assignment.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        res.render('departmentAssignments', {
            user: req.user,
            assignments: assignments,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: searchQuery,
            statusFilter: statusFilter,
            categoryFilter: categoryFilter,
            activePage: 'assignments'
        });

    } catch (error) {
        console.error("Error loading department assignments:", error);
        res.status(500).send("Internal Server Error");
    }
};


module.exports.overrideApprove = async (req, res) => {
    try {
        const { assignmentId, remarks } = req.body;
        const assignment = await Assignment.findById(assignmentId)
            .populate('studentId')
            .populate('reviewerId');

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        if (assignment.departmentId.toString() !== req.user.departmentId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const previousStatus = assignment.status;
        assignment.status = 'Approved';
        assignment.history.push({
            action: 'Approved',
            by: `${req.user.name} (HOD Override)`,
            remark: remarks || 'Approved by HOD',
            timestamp: new Date()
        });

        await assignment.save();

        if (previousStatus !== 'Approved') {
            await sendStudentNotification({
                studentEmail: assignment.studentId.email,
                studentName: assignment.studentId.name,
                assignmentTitle: assignment.title,
                status: 'Approved',
                professorName: req.user.name,
                remarks: remarks || 'Approved by HOD'
            });
        }

        return res.status(200).json({ success: true, message: 'Assignment approved successfully' });

    } catch (error) {
        console.error("Error overriding approval:", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports.overrideReject = async (req, res) => {
    try {
        const { assignmentId, remarks } = req.body;
        const assignment = await Assignment.findById(assignmentId)
            .populate('studentId');

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        if (assignment.departmentId.toString() !== req.user.departmentId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!remarks || remarks.trim().length < 10) {
            return res.status(400).json({ 
                success: false, 
                message: 'Rejection feedback is mandatory and must be at least 10 characters' 
            });
        }

        assignment.status = 'Rejected';
        assignment.history.push({
            action: 'Rejected',
            by: `${req.user.name} (HOD Override)`,
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

        return res.status(200).json({ success: true, message: 'Assignment rejected successfully' });

    } catch (error) {
        console.error("Error overriding rejection:", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


module.exports.getAssignmentDetail = async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const departmentId = req.user.departmentId;

        const assignment = await Assignment.findById(assignmentId)
            .populate('studentId', 'name email')
            .populate('reviewerId', 'name email role')
            .populate('departmentId', 'name');

        if (!assignment || assignment.departmentId._id.toString() !== departmentId.toString()) {
            return res.status(404).send('Assignment not found');
        }

        const professors = await User.find({
            departmentId,
            role: 'professor'
        }).select('name email');

        res.render('hodAssignmentDetail', {
            user: req.user,
            assignment: assignment,
            professors: professors,
            activePage: 'assignments'
        });

    } catch (error) {
        console.error("Error loading assignment detail:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.getHodProfile = async (req, res) => {
    try {
        const hodId = req.user._id;
        const assignments = await Assignment.find({ departmentId: req.user.departmentId });
        
        const stats = {
            total: assignments.length,
            approved: assignments.filter(a => a.status === 'Approved').length,
            pending: assignments.filter(a => a.status === 'Submitted' || a.status === 'Forwarded').length,
            rejected: assignments.filter(a => a.status === 'Rejected').length
        };

        res.render('hodProfile', {
            user: req.user,
            stats: stats,
            activePage: 'profile'
        });
    } catch (error) {
        console.error('Error loading HOD profile:', error);
        res.status(500).render('error', {
            message: 'Failed to load profile',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

module.exports.updateHodProfile = async(req, res) => {
    try{
        const { name, email, phone, office, address, city, state, postalCode } = req.body;
        const hodId = req.user._id;

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        const hod = await User.findById(hodId);
        hod.otp = otp;
        hod.otpExpires = otpExpires;
        hod.pendingProfileUpdate = {
            name,
            email,
            phone,
            office,
            address,
            city,
            state,
            postalCode
        };
        await hod.save();

        // Send email in background (don't await)
        sendProfileUpdateOTP(hod.email, otp).catch(err => {
            console.error('Error sending OTP email:', err);
        });

        return res.json({
            success: true,
            requireOtp: true,
            message: 'OTP sent to your email. Please verify to complete the profile update.'
        });

    } catch (error){
        console.error('Error updating HOD profile:', error);
        res.status(500).json({ success: false, error: 'Failed to process profile update. Please try again.' });
    }
};

module.exports.verifyAndUpdateHodProfile = async(req, res) => {
    try{
        const { otp } = req.body;
        const hodId = req.user._id;

        const hod = await User.findById(hodId).select('+otp +otpExpires +pendingProfileUpdate');

        if (!hod.otp || hod.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (hod.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP Expired' });
        }

        if (!hod.pendingProfileUpdate) {
            return res.status(400).json({ success: false, message: 'No pending profile update found' });
        }

        const pendingUpdate = hod.pendingProfileUpdate;

        hod.name = pendingUpdate.name;
        hod.email = pendingUpdate.email;
        hod.phone = pendingUpdate.phone;
        hod.office = pendingUpdate.office;
        hod.address = pendingUpdate.address;
        hod.city = pendingUpdate.city;
        hod.state = pendingUpdate.state;
        hod.postalCode = pendingUpdate.postalCode;

        // Cleare OTP and pending update
        hod.otp = undefined;
        hod.otpExpires = undefined;
        hod.pendingProfileUpdate = undefined;
        
        await hod.save();

        return res.json({
            success: true,
            message: 'Profile updated successfully!'
        });

    } catch (error){
        console.error('Error verifying HOD profile update:', error);
        return res.status(500).json({ success: false, message: 'Server error during verification.' });
    }
};

module.exports.resendProfileOTP = async (req, res) => {
    try {
        const hodId = req.user._id;
        const hod = await User.findById(hodId).select('+pendingProfileUpdate');

        if (!hod.pendingProfileUpdate) {
            return res.status(400).json({ success: false, message: 'No pending profile update. Please edit your profile first.' });
        }
        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + (10 * 60 * 1000); // 10 minutes

        hod.otp = otpCode;
        hod.otpExpires = otpExpires;

        await hod.save();
        await sendProfileUpdateOTP(hod.email, otpCode);

        return res.json({
            success: true,
            message: 'OTP resent to your email'
        });

    } catch (error) {
        console.error('Error resending OTP:', error);
        return res.status(500).json({ success: false, message: 'Failed to resend OTP' });
    }
};
