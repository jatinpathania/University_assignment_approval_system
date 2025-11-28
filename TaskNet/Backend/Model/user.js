const mongoose= require('mongoose');
const bcrypt= require('bcryptjs')

const userSchema= new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone:{
        type: String,
        required: false
    },
    role: {
        type: String,
        enum: ['admin', 'professor', 'HOD', 'student'],
        default: "student"
    },
    departmentId :{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',     //linkk creatd
        required: false
    }
},{ timestamps: true })

//mongose middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.statics.getPaginatedList = async function(params) {
    const { page, search, roleFilter, departmentFilter } = params;
    
    const ITEMS_PER_PAGE = 20; 
    const skip = (page - 1) * ITEMS_PER_PAGE;

    let matchConditions = [];
    matchConditions.push({ role: { $ne: 'admin' } });

    if (roleFilter !== 'All') {
        matchConditions.push({ role: roleFilter });
    }

    if (departmentFilter !== 'All') {
        if (mongoose.Types.ObjectId.isValid(departmentFilter)) {
            matchConditions.push({ departmentId: new mongoose.Types.ObjectId(departmentFilter) });
        } else {
            matchConditions.push({ departmentId: new mongoose.Types.ObjectId('000000000000000000000000') });
        }
    }

    if (search) {
        const searchCriteria = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        };
        matchConditions.push(searchCriteria);
    }
    
    const matchStage = { $match: { $and: matchConditions } };


    const pipeline = [
        matchStage, 

        {
            $lookup: {
                from: 'departments', 
                localField: 'departmentId',
                foreignField: '_id',
                as: 'departmentDetails'
            }
        },

        { $unwind: { path: '$departmentDetails', preserveNullAndEmptyArrays: true } },

        {
            $project: {
                name: 1,
                email: 1,
                role: 1,
                phone: 1,
                createdAt: 1,
                status: { $literal: 'Active' }, 
                departmentName: { 
                    $ifNull: ['$departmentDetails.name', 'N/A'] 
                }
            }
        },

        { 
            $facet: {
                paginatedResults: [
                    { $sort: { name: 1 } },
                    { $skip: skip },
                    { $limit: ITEMS_PER_PAGE }
                ],
                totalCount: [
                    { $count: 'count' }
                ]
            }
        }
    ];

    const aggregationResult = await this.aggregate(pipeline);

    const users = aggregationResult[0].paginatedResults || [];
    const totalCount = aggregationResult[0].totalCount.length > 0 ? aggregationResult[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    
    return { users, totalCount, totalPages };
};

const User= mongoose.model("User", userSchema);
module.exports= User