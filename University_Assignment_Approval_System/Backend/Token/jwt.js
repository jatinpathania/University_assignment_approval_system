const jwt= require('jsonwebtoken')
require('dotenv').config();

module.exports.jwtToken=(user)=>{
    return jwt.sign({id: user._id,name: user.name, role: user.role }, process.env.SECRET_KEY, {expiresIn: "1h"} )
}