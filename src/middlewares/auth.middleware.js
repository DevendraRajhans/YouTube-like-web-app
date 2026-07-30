import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"

// here if res is not used anywhere below then we can put '_' (underscore) 
// const verifyJWT = asyncHandler( async (req, res, next) =>
// instead of this we can write as below 

const verifyJWT = asyncHandler( async (req, _ , next) => {  
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select(" -password -refreshToken")
        
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;

        next();
        
    } catch (error) {
        throw new ApiError(401, "Invalid Access Token")
    }

})


export {verifyJWT}