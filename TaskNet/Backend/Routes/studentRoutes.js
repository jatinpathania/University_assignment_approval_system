const express = require('express');
const router = express.Router();
const { protectRoute, restrictTo } = require('../middleware/auth');
const { 
    getStudentDashboard,
    getUploadAssignmentForm,
    uploadAssignment,
    getBulkUploadForm,
    bulkUploadAssignments,
    getAssignmentsList,
    } = require('../Controllers/studentController');
const upload= require('../config/multer')

router.use(protectRoute, restrictTo(['student']));
router.get('/dashboard', getStudentDashboard);
router.get('/assignments/upload', getUploadAssignmentForm)
router.post('/assignments/upload', upload.single('assignmentFile') ,uploadAssignment);
router.get('/assignments/bulk-upload', getBulkUploadForm);
router.post('/assignments/bulk-upload', upload.array('assignmentFiles', 5), bulkUploadAssignments) 
router.get('/assignments', getAssignmentsList )

module.exports = router;