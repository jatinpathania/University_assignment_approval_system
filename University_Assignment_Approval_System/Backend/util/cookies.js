const getJwtToken= require('../Token/jwt')

const cookieToken= (user,res)=>{
    const token= getJwtToken.jwtToken(user);
    user.password= undefined;
    res.cookie('token', token,{
        httpOnly: true,             //Prevents JavaScript  from accessing your cookie
        secure: process.env.NODE_ENV ===  "production",      //Ensures cookies are only sent over HTTPS, not plain HTTP
        sameSite: 'strict'    //Conttrols whether th browser sends cookies along with cross-site requests
    })
    return token;
}

module.exports= cookieToken;