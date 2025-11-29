const connectMongodb= require('../db/db')
const User= require('../Model/user')
const bcrypt= require('bcryptjs')

const createAdmin= async()=>{
    try{
        await connectMongodb();
        const name= process.env.ADMIN_NAME
        const email= process.env.ADMIN_EMAIL
        const password= process.env.ADMIN_PASSWORD
        const role= "admin";
        const existing= await User.findOne({email})
        if(existing){
            console.log("Admin alredy exists")
            process.exit(0);
        }
        await User.create({name , email, password: password, role})
        console.log("Admin created successfully")
        process.exit(0);
    }
    catch(e){
        console.log("eror creating admin", e)
        process.exit(1)
    }
} 

createAdmin()
