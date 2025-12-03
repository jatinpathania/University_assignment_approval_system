const multer = require('multer');
const storage = multer.memoryStorage();

const fileFilter =(req,file,cb) =>{
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if(allowedMimes.includes(file.mimetype)) {
        cb(null,true);
    }
    else{
        cb(new Error('Only PDF and image files (PNG, JPG) are allowed!'),false);
    }
};

const upload =multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10*1024*1024 
    }
});

module.exports = upload;