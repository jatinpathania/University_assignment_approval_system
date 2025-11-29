const Department= require('./department')

const getPaginatedDepartmentsWithCounts = async (matchCriteria, skip, limit)=>{
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
    return Department.aggregate(pipeline);
};

module.exports= getPaginatedDepartmentsWithCounts