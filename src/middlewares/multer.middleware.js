import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) { // cb = callback
        cb(null, "./public/temp") 
    },
    filename: function (req, file, cb) {
        
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        // cb(null, file.fieldname + '-' + uniqueSuffix)
        // // this is used to save the every file with different names
        
        cb(null, file.originalname)
        // but for now this is ok
    }
})

export const upload = multer({ 
    storage
})
