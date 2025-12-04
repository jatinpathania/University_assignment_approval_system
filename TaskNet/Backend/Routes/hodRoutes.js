const express = require('express');
const router = express.Router();
const { protectRoute, restrictTo } = require('../middleware/auth');
const {
    getHodDashboard,
    getProfessorOversight,
    getProfessorDetail,
    getDepartmentAnalytics,
    getDepartmentAssignments,
    overrideApprove,
    overrideReject,
    getAssignmentDetail,
    getHodProfile,
    updateHodProfile,
    verifyAndUpdateHodProfile,
    resendProfileOTP
} = require('../Controllers/hodController');

router.use(protectRoute, restrictTo(['HOD']));

router.get('/dashboard', getHodDashboard);
router.get('/professors', getProfessorOversight);
router.get('/professors/:id', getProfessorDetail);
router.get('/assignments', getDepartmentAssignments);
router.get('/assignments/:id', getAssignmentDetail);
router.get('/analytics', getDepartmentAnalytics);
router.post('/assignments/:id/override-approve', overrideApprove);
router.post('/assignments/:id/override-reject', overrideReject);
router.get('/profile', getHodProfile);
router.post('/profile/update', updateHodProfile);
router.post('/profile/verify-update', verifyAndUpdateHodProfile);
router.post('/profile/resend-otp', resendProfileOTP);

module.exports = router;