const User= require('../Model/user')
const Assignment= require('../Model/assignment')
const { uploadToCloudinary } = require('../config/cloudinary')
const { sendSubmissionNotification }= require('../util/emailSender')

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
    const { title, description, category } = req.body;
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
    const { title, description, category } = req.body;

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

    } catch (error) {
        console.error("Submission error:", error);
        return res.status(500).json({ success: false, message: 'Server error during submission.' });
    }
};