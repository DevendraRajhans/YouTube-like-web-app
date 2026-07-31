import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        console.log("Uploading:", localFilePath);

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        // console.log("SUCCESS");
        // console.log(response);

        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response;

    } catch (error) {
        console.log("ERROR FROM CLOUDINARY:");
        console.log(error);

        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return null;
    }
};

const getPublicIdFromUrl = (url) => {
    // url will be like = http://res.cloudinary.com/amw5vgl3/image/upload/v1785351652/irxxjqj4ertnyeuxniuk.webp
    
    const filename = url.split("/").pop();    // filename = irxxjqj4ertnyeuxniuk.webp
    
    return filename.substring(0, filename.lastIndexOf(".")) // public id = irxxjqj4ertnyeuxniuk

}

const deleteFromCloudinary = async(public_id) => {
    
    if(!public_id) return null;
    
    return await cloudinary.uploader.destroy(public_id)
}

export { 
    uploadOnCloudinary,
    getPublicIdFromUrl,
    deleteFromCloudinary
};