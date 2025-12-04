const express = require('express');
const router = express.Router();
const { protectRoute, restrictTo } = require('../middleware/auth');
const { 
    getProfessorDashboard,
    getProfessorReviews,
    getReviewPage,
    processAssignmentReview,
    verifyAndApprove,
    getProfessorProfile,
    updateProfessorProfile,
    verifyAndUpdateProfessorProfile,
    resendProfileOTP,
    rejectAssignment,
    forwardAssignment
    } = require('../Controllers/professorController');
const upload= require('../config/multer');


router.use(protectRoute, restrictTo(['professor']));

router.get('/dashboard', getProfessorDashboard);
router.get('/reviews', getProfessorReviews);
router.get('/assignments/:id/review', getReviewPage);
router.post('/assignments/:id/process', upload.single('signatureFile'), processAssignmentReview)
router.post('/assignments/:id/verify-approval', verifyAndApprove);
router.post('/assignments/:id/reject', rejectAssignment)
router.post('/assignments/:id/forward', forwardAssignment)

router.get('/profile', getProfessorProfile);
router.post('/profile/update', updateProfessorProfile);
router.post('/profile/verify-update', verifyAndUpdateProfessorProfile);
router.post('/profile/resend-otp', resendProfileOTP);

module.exports = router;