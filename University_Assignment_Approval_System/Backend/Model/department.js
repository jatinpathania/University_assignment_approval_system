const mongoose= require('mongoose')

const departmentSchema= new mongoose.Schema({
    name:{
        type: String,
        required: true,
        unique: true,
        trim : true
    },
    programType:{
        type: String,
        required: true,
        enum: ['UG', 'PG', 'Research'],
        default: 'UG'
    },
    address:{
        type: String,
        required: true
    },
    shortCode:{
        type: String,
        sparse: true
    }
},{ timestamps: true} )

departmentSchema.statics.getPaginatedDepartmentsWithCounts = async function(matchCriteria, skip, limit){
      const pipeline= [
            { $match: matchCriteria },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'departmentId',
                    as: 'users',
                }
            },
            // this finds me
            //find users where user.departmntid=== departments._id

            {
                $project: {        //what fields go in frontend
                    name: 1,
                    programType: 1,
                    address: 1,
                    userCount: { $size: '$users' } 
                }
            },

            { $sort: { name: 1 } },

            {
                $facet: {          //allws runnig multile pipelines in parl
                    paginatedResults:[
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    totalCount: [
                        { $count: 'count' }    //how many data match filter
                    ]
                }
            }
        ];
    return this.aggregate(pipeline);
};

const Department= mongoose.model("Department", departmentSchema);
module.exports= Department