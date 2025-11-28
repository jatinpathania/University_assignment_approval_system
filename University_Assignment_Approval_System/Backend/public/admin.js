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
            process.exit(1);
        }
        const hashedPassword= await bcrypt.hash(password,10);
        await User.create({name , email, password: hashedPassword, role})
        console.log("Admin created successfully")
    }
    catch(e){
        console.log("eror creating admin", e)
        process.exit(1)
    }
} 

createAdmin()
