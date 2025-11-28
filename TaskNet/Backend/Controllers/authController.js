const User= require('../Model/user')
const cookieToken= require('../util/cookies')
const bcrypt= require('bcryptjs')

module.exports.login= async(req,res)=>{
    try{
        const {email, password}= req.body;
        if(!email || !password){
            return res.status(404).render("login", { 
                emailError: !email ? "Email is required." : null,
                passwordError: !password ? "Password is required." : null,
                oldEmail: email
            });
        }
        const user= await User.findOne({email})
        if(!user) return res.render("login", { 
            emailError: "Invalid email. User not found.", 
            passwordError: null,
            oldEmail: email 
        });

        const isMatch= await bcrypt.compare(password, user.password);
        if(!isMatch) return res.render("login", { 
            emailError: null, 
            passwordError: "Password invalid.",
            oldEmail: email 
        });

        cookieToken(user, res);   
        const userRole= user.role.toLowerCase();  
        if(userRole === 'admin'){  
            return res.redirect('/admin/dashboard')
        }
        else if(userRole === 'hod'){  
            return res.redirect('/hod/dashboard')
        }
        else if(userRole === 'professor'){  
            return res.redirect('/professor/dashboard')
        }
        else{
            return res.redirect('/student/dashboard')
        }
    }
    catch(e){
        console.error("Login Error:", e);
        res.status(500).render('login', {
            emailError: null,
            passwordError: null,
            oldEmail: req.body.email || '',
            generalError: 'Internal server error during login.'
        })
    }
}