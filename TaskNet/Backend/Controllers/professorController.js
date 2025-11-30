const Assignment = require('../Model/assignment');
const User = require('../Model/user');

module.exports.getProfessorDashboard = async (req, res) => {
    try{
        const professorId = req.user._id;
        const pendingAssignments = await Assignment.find({ 
            reviewerId: professorId, 
            status: 'Submitted' 
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
            if (item._id === 'Submitted') stats.Pending = item.count;
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