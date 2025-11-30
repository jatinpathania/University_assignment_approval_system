const express= require('express')
const router= express.Router()
const { login }= require('../Controllers/authController')
const { protectRoute, isLoggedIn, restrictTo } = require('../middleware/auth')

router.get('/', isLoggedIn, (req,res)=>{
    res.render('landingPage');
})

router.get('/login', isLoggedIn, (req,res)=>{
    res.render('login' ,{emailError: null, passwordError: null, oldEmail: ''});
})

router.post('/login', login);

router.get('/footer-links', (req,res)=>{
    res.render('footerLinks');
})

router.post('/logout', (req,res)=>{
    res.clearCookie('token');
    res.redirect('/');
})

module.exports= router