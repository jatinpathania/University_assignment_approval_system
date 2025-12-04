const express= require('express')
const path= require('path')
const cookieParser= require('cookie-parser')
const connectMongodb= require('./db/db')
const authRouter= require('./Routes/authRoutes')
const adminRouter= require('./Routes/adminRoutes')
const studentRouter= require('./Routes/studentRoutes')
const professorRouter= require('./Routes/professorRoutes')
const hodRouter= require('./Routes/hodRoutes')

const app= express();
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

app.set("view engine","ejs")
app.set("views", path.join(__dirname,'..','Frontend', 'views'))
app.use(express.static(path.join(__dirname,'..', 'Frontend', 'public')))

const PORT = process.env.PORT || 3000;

connectMongodb();


app.use('/', authRouter);
app.use('/admin', adminRouter);
app.use('/student', studentRouter);
app.use('/professor', professorRouter);
app.use('/hod', hodRouter);


app.listen(PORT, err=>{
    if(err) console.log(err);
    else console.log(`Server started at port`);
})