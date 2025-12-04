const mongoose= require('mongoose')
const bcrypt= require('bcryptjs')
const User = require('../Model/user')
const getPaginatedList= require('../Model/userQueries')
const Department = require('../Model/department')
const getPaginatedDepartmentsWithCounts= require('../Model/departmentQueries')
const Assignment= require('../Model/assignment');
const { sendWelcomeEmail, sendAdminUpdateNotification }= require('../util/emailSender')

module.exports.getAdminDashboard = async (req, res) => {
    try {
        const totalDepartments = await Department.countDocuments();
        const userRoleCount = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ])

        const stats = {
            totalDepartments: totalDepartments,
            totalUsers: 0,
            adminCount: 0,
            hodCount: 0,
            professorCount: 0,
            studentCount: 0
        };

        userRoleCount.forEach(ele => {
            const role = ele._id.toLowerCase();
            stats.totalUsers += ele.count;
            if (role === 'admin') stats.adminCount = ele.count;
            else if (role === 'HOD') stats.hodCount = ele.count;
            else if (role === 'professor') stats.professorCount = ele.count;
            else if (role === 'student') stats.studentCount = ele.count;
        })

        res.render('adminDashboard', {
            user: req.user,
            stats: stats,
            activePage: 'dashboard'
        })
    }
    catch (e) {
        console.log("Error fetching admin dashboard data:", e);
        res.status(500).render('adminDashboard', {
            user: req.user,
            stats: {
                totalDepartments: 'N/A',
                totalUsers: 'N/A',
                adminCount: 'N/A',
                hodCount: 'N/A',
                professorCount: 'N/A',
                studentCount: 'N/A',
            },
            error: "Failed to load dashboard data. Please check database connection"
        })
    }
}



module.exports.getCreateDepartmentForm = (req, res) => {
    res.render('createDepartment', {
        user: req.user,
        errors: {},
        formData: {},
        successMessage: null,
        activePage: 'departments'
    })
}



module.exports.createDepartment = async (req, res) => {
    const { name, programType, address } = req.body;
    let errors = {};
    let hasError = false;

    if (!name) { errors.name = "Department name is required!"; hasError = true }
    if (!programType) { errors.programType = "Program type is required!"; hasError = true }
    if (!address) { errors.address = "Address is required!"; hasError = true }

    if (hasError) {
        return res.render('createDepartment', {
            user: req.user,
            errors: errors,
            formData: req.body,
            successMessage: null,
            activePage: "departments"
        })
    }

    try {
        const newDepartment = new Department({ name, programType, address })
        await newDepartment.save();
        return res.render('createDepartment', {
            user: req.user,
            errors: {},
            formData: {},
            successMessage: `Department ${name} created successfully!`,
            activePage: "departments"
        })
    }
    catch (error) {
        let errorMessage = "An internal server error occured"
        if (error.code && error.code === 11000) {
            errorMessage = "  A department with this name already exists"
        }
        else {
            console.error('Department creation eror', error);
        }

        return res.status(400).render('createDepartment', {
            user: req.user,
            errors: { general: errorMessage },
            formData: req.body,
            successMessage: null,
            activePage: 'departments'
        })
    }
}



module.exports.getDepartmentList = async (req, res) => {
    const ITEMS_PER_PAGE = 10;
    const page = Number(req.query.page) || 1;
    const search = req.query.search || '';
    const type = req.query.type || 'ALL';

    const skip = (page - 1) * ITEMS_PER_PAGE;

    let matchCriteria = {};
    if (search) {
        matchCriteria.name = { $regex: search, $options: 'i' }  // regex mesna regular expresssion..optoions to i means also search lower and uppercase both;
    }

    if (type !== 'ALL') {
        matchCriteria.programType = type;
    }

    try {

        const aggregationResult = await getPaginatedDepartmentsWithCounts(matchCriteria, skip, ITEMS_PER_PAGE)
        //this will give me liek this
        // [
        //     {
        //         "paginatedResults": [...],
        //         "totalCount": [{"count": 47}]
        //     }
        // ]
        // to extract things to return on frontend.. we will use these varibles to store res and send them then to frontend

        const departments = aggregationResult[0].paginatedResults;
        const totalCount = aggregationResult[0].totalCount > 0 ? aggregationResult[0].totalCount[0].count : 0;

        const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
        const programTypes = Department.schema.path('programType').enumValues;

        res.render('departmentList', {
            user: req.user,
            departments: departments,
            activePage: 'departments',
            error: null,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: search,
            filterType: type,
            programTypes: programTypes
        })

    }
    catch (error) {
        console.error("Error fetching department list:", error);
        res.status(500).render('departmentList', {
            user: req.user,
            departments: [],
            error: 'Failed to load department list. ' + error.message,
            activePage: 'departments',
            currentPage: 1,
            totalPages: 1,
            searchQuery: '',
            filterType: 'All',
            programTypes: Department.schema.path('programType').enumValues,
        });
    }
}


module.exports.getEditDepartmentForm = async (req, res) => {
    try {
        const departmentId = req.params.id;
        const department = await Department.findById(departmentId);

        if (!department) {
            return res.status(404).send('<p>Department not found.</p>');
        }

        const programTypes = Department.schema.path('programType').enumValues;

        res.render('editDepartmentModal', {
            dept: department,
            programTypes: programTypes,
            errors: {},
            successMessage: null
        });

    } catch (error) {
        console.error("Error fetching department for edit:", error);
        res.status(500).send('<p>Internal server error while loading edit form.</p>');
    }
};


module.exports.updateDepartment = async (req, res) => {
    const departmentId = req.params.id;
    const { name, programType, address } = req.body;
    let errors = {};
    let hasError = false;

    if (!name) { errors.name = 'Department Name is required.'; hasError = true; }
    if (!programType) { errors.programType = 'Program Type is required.'; hasError = true; }
    if (!address) { errors.address = 'Address is required.'; hasError = true; }

    if (hasError) {
        const programTypes = Department.schema.path('programType').enumValues;
        return res.status(400).render('editDepartmentModal', {
            dept: { _id: departmentId, name, programType, address },
            programTypes: programTypes,
            errors: errors,
            successMessage: null
        });
    }

    try {
        const updatedDepartment = await Department.findByIdAndUpdate(
            departmentId,
            { name, programType, address },
            { new: true, runValidators: true }
        );

        if (!updatedDepartment) {
            errors.general = 'Department not found for update.';
            hasError = true;
        }

        const programTypes = Department.schema.path('programType').enumValues;
        return res.render('editDepartmentModal', {
            dept: updatedDepartment,
            programTypes: programTypes,
            errors: {},
            successMessage: `Department '${name}' updated successfully!`,
        });

    } catch (error) {
        let errorMessage = 'An internal server error occurred.';
        if (error.code && error.code === 11000) {
            errorMessage = 'A department with this name already exists.';
        } else {
            console.error("Department update error:", error);
        }

        const programTypes = Department.schema.path('programType').enumValues;
        return res.status(500).render('editDepartmentModal', {
            dept: { _id: departmentId, name, programType, address },
            programTypes: programTypes,
            errors: { general: errorMessage },
            successMessage: null,
        });
    }
};


module.exports.deleteDepartment = async (req, res) => {
    try {
        const departmentId = req.params.id;
        const userCount = await User.countDocuments({ departmentId: departmentId });

        if (userCount > 0) {
            const department = await Department.findById(departmentId);
            return res.status(400).json({
                success: false,
                message: `Cannot delete department '${department.name}'. ${userCount} associated user(s) must be reassigned first.`
            });
        }

        const result = await Department.findByIdAndDelete(departmentId);

        if (!result) {
            return res.status(404).json({ success: false, message: 'Department not found.' });
        }

        return res.status(200).json({
            success: true,
            message: `Department '${result.name}' deleted successfully.`
        });

    } catch (error) {
        console.error("Department deletion error:", error);
        return res.status(500).json({ success: false, message: 'Internal server error during deletion.' });
    }
};

module.exports.getCreateUserForm = async (req, res) => {
    try {
        const departments = await Department.find().select('name _id').sort({ name: 1 });

        res.render('createUser', {
            user: req.user,
            departments: departments,
            roles: ['student', 'professor', 'HOD'],
            errors: {},
            formData: {},
            successMessage: null,
            activePage: 'addUser'
        });

    } catch (error) {
        console.error("Error fetching departments for user form:", error);
        res.status(500).render('createUser', {
            user: req.user,
            departments: [],
            roles: ['student', 'professor', 'HOD'],
            errors: { general: 'Failed to load form data.' },
            formData: {},
            successMessage: null,
            activePage: 'addUser'
        });
    }
}

module.exports.createUser = async (req, res) => {
    const { name, email, password, phone, departmentId, role } = req.body;
    let errors = {};
    let hasError = false;
    let departments = [];

    const defaultPassword = password || Math.random().toString(36).substring(2, 10);

    if (!name) { errors.name = 'Name is required.'; hasError = true; }
    if (!email) { errors.email = 'Email is required.'; hasError = true; }
    if (!role) { errors.role = 'Role is required.'; hasError = true; }
    if (role !== 'student' && !departmentId) {
        errors.departmentId = 'Department is required for this role.'; hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        errors.email = 'Invalid email format.'; hasError = true;
    }

    if (password) {
        const passwordRegex = /^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passwordRegex.test(password)) {
            errors.password = 'Password must be at least 8 characters long and contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?).'; 
            hasError = true;
        }
    }

    try {
        departments = await Department.find().select('name _id').sort({ name: 1 });

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            errors.email = 'This email is already registered.'; hasError = true;
        }

        if (hasError) {
            return res.status(400).render('createUser', {
                user: req.user,
                departments: departments,
                roles: ['student', 'professor', 'HOD'],
                errors: errors,
                formData: req.body,
                successMessage: null,
                activePage: 'addUser'
            });
        }

        const newUser = new User({
            name,
            email,
            password: defaultPassword,
            phone: phone || null,
            role,
            departmentId: departmentId ? departmentId : undefined
        });

        await newUser.save();

        //email sender
        let emailStatus = "";
        const emailSent = await sendWelcomeEmail({ 
            email: newUser.email, 
            name: newUser.name, 
            password: defaultPassword,
            role: newUser.role 
        });
        
        emailStatus = emailSent 
            ? "A welcome email with credentials has been sent." 
            : "Warning: Failed to send welcome email. Check server logs.";

        return res.render('createUser', {
            user: req.user,
            departments: departments,
            roles: ['student', 'professor', 'HOD'],
            errors: {},
            formData: {},
            successMessage: `User ${name} created successfully! Default password: ${defaultPassword}. ${emailStatus}`,
            activePage: 'addUser'
        });

    } catch (error) {
        console.error("User creation error:", error);
        if (departments.length === 0) {
            departments = await Department.find().select('name _id').sort({ name: 1 });
        }

        return res.status(500).render('createUser', {
            user: req.user,
            departments: departments,
            roles: ['student', 'professor', 'HOD'],
            errors: { general: 'An internal server error occurred during user creation.' },
            formData: req.body,
            successMessage: null,
            activePage: 'addUser'
        });
    }
};


module.exports.getUserList = async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const roleFilter = req.query.role || 'All';
    const departmentFilter = req.query.department || 'All';

    let users = [];
    let totalPages = 1;
    let error = null;

    try {
        const params = { page, search, roleFilter, departmentFilter };

        const result = await getPaginatedList(params);
        users = result.users;
        totalPages = result.totalPages;

    } catch (err) {
        console.error("Error fetching user list:", err);
        error = 'Failed to load user list. ' + err.message;
    }

    const allDepartments = await Department.find().select('name _id').sort({ name: 1 });
    const roles = ['student', 'professor', 'HOD'];

    res.render('usersList', {
        user: req.user,
        users: users,
        allDepartments: allDepartments,
        roles: roles,
        activePage: 'users',
        error: error,
        currentPage: page,
        totalPages: totalPages,
        searchQuery: search,
        filterRole: roleFilter,
        filterDepartment: departmentFilter
    });
};


module.exports.getEditUserForm = async (req, res) => {
    try {
        const userId= req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send('<div class="error-message">Invalid User ID format.</div>');
        }

        const [userToEdit, allDepartments] = await Promise.all([
            User.findById(userId).select('-password'),
            Department.find().select('name _id').sort({ name: 1 })
        ]);

        if (!userToEdit) {
            return res.status(404).send('<div class="error-message">User not found.</div>');
        }

        if (userToEdit.role === 'admin') {
            return res.status(403).send('<div class="error-message">Editing admin user details via this route is restricted.</div>');
        }

        res.render('editUserModal', {
            userToEdit: userToEdit,
            allDepartments: allDepartments,
            error: null,
            success: null,
            isPartial: true
        });

    } catch (error) {
        console.error("Error loading edit user form:", error);
        res.status(500).send('<div class="error-message">Server error loading user data.</div>');
    }
}


module.exports.updateUser = async (req, res) => {
    const userId = req.params.id;
    const { name, email, phone, departmentId, newPassword } = req.body;
    let updateData = {};
    let changes = {};

    try {
        const currentUser = await User.findById(userId).populate('departmentId');
        if(!currentUser) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        if(email && email !== currentUser.email) {
            const existingUserWithEmail = await User.findOne({ email: email });
            if(existingUserWithEmail) {
                return res.status(400).json({ success: false, error: 'Email address is already in use by another user.' });
            }
            changes.email = email;
        }

        if (newPassword) {
            if (newPassword.length < 6) {
                return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(newPassword, salt);
            changes.passwordChanged = true;
        }

        if (name && name.trim() !== currentUser.name) {
            changes.name = name;
        }
        if (phone && phone.trim() !== currentUser.phone) {
            changes.phone = phone;
        }
        if (departmentId && departmentId.toString() !== currentUser.departmentId?._id.toString()) {
            const dept = await Department.findById(departmentId);
            changes.departmentName = dept ? dept.name : departmentId;
        }

        updateData = {
            ...updateData,
            name: name || currentUser.name,
            email: email || currentUser.email,
            phone: phone || currentUser.phone,
            departmentId: departmentId || currentUser.departmentId
        };

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).populate('departmentId');

        if (!updatedUser) {
            return res.status(404).json({ success: false, error: 'User not found during update.' });
        }

        console.log(`[Admin Update] Changes detected:`, changes);
        
        if (Object.keys(changes).length > 0) {
            console.log(`[Admin Update] Sending notification email to ${updatedUser.email}`);
            const emailSent = await sendAdminUpdateNotification({
                email: updatedUser.email,
                name: updatedUser.name,
                changes: changes,
                adminName: req.user.name
            });

            console.log(`[Admin Update] Email send result:`, emailSent);
            if (!emailSent) {
                console.warn(`Email notification could not be sent to ${updatedUser.email}, but user was updated successfully.`);
            }
        } else {
            console.log(`[Admin Update] No changes detected, skipping email notification`);
        }

        return res.json({
            success: true,
            message: `${updatedUser.name} details updated successfully!`,
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                departmentName: updatedUser.departmentId ? updatedUser.departmentId.name : 'N/A',
                status: updatedUser.status || 'Active'
            }
        });

    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({ success: false, error: 'Server error during update: ' + error.message });
    }
};



module.exports.deleteUser = async (req, res) => {
    const userId = req.params.id;
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid User ID format.' });
        }

        const userToDelete = await User.findById(userId);

        if (!userToDelete) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        if (userToDelete.role === 'student') {
            const pendingAssignmentsCount = await Assignment.countDocuments({ 
                studentId: userId,
                submissionStatus: { $ne: 'Submitted' } 
            });

            if (pendingAssignmentsCount > 0) {
                return res.status(409).json({ 
                    success: false, 
                    message: `Cannot delete ${userToDelete.name}. This student has ${pendingAssignmentsCount} pending assignment submissions.` 
                });
            }
        }

        if (userToDelete.role === 'professor' || userToDelete.role === 'HOD') {
            const createdAssignmentsCount = await Assignment.countDocuments({
                professorId: userId
            });

            if (createdAssignmentsCount > 0) {
                return res.status(409).json({
                    success: false,
                    message: `Cannot delete ${userToDelete.name}. This user is responsible for ${createdAssignmentsCount} active assignments.`
                });
            }
        }
        
        await User.findByIdAndDelete(userId);
        
        return res.json({ 
            success: true, 
            message: `User ${userToDelete.name} deleted successfully.`,
            deletedUserId: userId
        });

    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ success: false, message: 'Server error during deletion: ' + error.message });
    }
};
