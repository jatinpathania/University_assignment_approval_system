const express = require('express');
const router = express.Router();
const { protectRoute, restrictTo } = require('../middleware/auth');
const { 
    getProfessorDashboard
    } = require('../Controllers/professorController');


router.use(protectRoute, restrictTo(['professor']));

router.get('/dashboard', getProfessorDashboard);


module.exports = router;