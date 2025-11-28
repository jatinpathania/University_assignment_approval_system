const express= require('express');
const router= express.Router();
const {protectRoute, restrictTo} = require('../middleware/auth')
const { 
    getAdminDashboard, 
    getCreateDepartmentForm, 
    createDepartment, 
    getDepartmentList, 
    getEditDepartmentForm, 
    updateDepartment, 
    deleteDepartment,
    getCreateUserForm,
    createUser,
    getUserList,
    getEditUserForm,
    updateUser,
    deleteUser
    } = require('../Controllers/adminController')

    
router.use(protectRoute, restrictTo(['admin']))         // apply to all admin routes
router.get('/dashboard', getAdminDashboard)

router.get('/departments', getDepartmentList)
router.get('/departments/create', getCreateDepartmentForm);
router.post('/departments/create', createDepartment)
router.get('/departments/:id/edit', getEditDepartmentForm );
router.post('/departments/:id/update', updateDepartment)
router.post('/departments/:id/delete', deleteDepartment)

router.get('/users', getUserList);
router.get('/add-user', getCreateUserForm);
router.post('/users/create', createUser);
router.get('/users/:id/edit', getEditUserForm);
router.post('/users/:id/update', updateUser);
router.post('/users/:id/delete', deleteUser);

module.exports= router;