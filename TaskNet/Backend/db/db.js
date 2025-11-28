const mongoose= require("mongoose")
const dotenv = require("dotenv")

dotenv.config()

const connectMongodb=()=>{
        mongoose.connect(process.env.MONGO_URI)
        .then(()=> console.log('Database connected'))
}

module.exports= connectMongodb