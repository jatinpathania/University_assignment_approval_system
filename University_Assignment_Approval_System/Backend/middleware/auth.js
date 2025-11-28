const User= require('../Model/user')
const jwt= require('jsonwebtoken')

//for simple loggin in to see dashboard
const protectRoute= async(req,res,next)=>{
    try{
        const token= req.cookies.token;
        if(!token){
            return res.redirect('/login');
        }
        const decoded= jwt.verify(token, process.env.SECRET_KEY);
        const user= await User.findById(decoded.id).select('-password')    // pass excluded
        if(!user){
            res.clearCookie('token')
            return res.redirect('/login');
        }

        req.user= user;
        next();
    }
    catch(e){
        res.clearCookie('token');
        return res.redirect('/login');
    }
}

// for not allowing loggedin user to see login page again
const isLoggedIn= async(req,res,next)=>{
    try{
        const token= req.cookies.token;
        if(!token){
            return next(); //login apge
        }
        const decoded= jwt.verify(token, process.env.SECRET_KEY);
        const user= await User.findById(decoded.id).select('role') 

        if(user){
            const userRole= user.role.toLowerCase();
            if(userRole == 'admin'){
                return res.redirect('/admin/dashboard')
            } else if(userRole === 'HOD') {
                return res.redirect('/hod/dashboard');
            } else if(userRole === 'professor') {
                return res.redirect('/professor/dashboard');
            } else{
                return res.redirect('/student/dashboard');
            }
        }
        res.clearCookie('token');
        next();
    }
    catch(e){
        res.clearCookie('token')
        next();    //send to login page
    }
}

// for allowing a logged in user to see only their dashboard than any other
const restrictTo=( allowedRoles )=>{
    return (req,res,next)=>{
        if(!req.user || !req.user.role){ //check protete route
            res.clearCookie('token');
            return res.redirect('/login');
        }
        
        const userRole= req.user.role.toLowerCase();
        if(!allowedRoles.map(r=> r.toLowerCase()).includes(userRole)){
            switch(userRole){
                case 'admin':
                    return res.redirect('/admin/dashboard');
                case 'hod' :
                    return res.redirect('/hod/dashboard');
                case 'professor':
                    return res.redirect('/professor/dashboard');
                default:
                    return res.redirect('/student/dashboard')
            }
        }

        next();  // loign
    }
}

module.exports= {protectRoute, isLoggedIn, restrictTo};