import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"

// to write controllers first think for the steps we are going to do
const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refrest token field from response
    // check for user creation
    // return response

    // steps started 
    // get user details from frontend
    // in routes we used middleware multer for files
    const {fullName, email, username, password} = req.body
    // console.log("email", email)

    // validation - not empty
    if(
        [fullName, email, username, password].some( (field) => field?.trim() === "" ) // this means if any of the field is empty then do following stuff
    ){
        throw new ApiError(400, "All fields are required.")
    }

    // check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [ {email}, {username} ]
    })

    if(existedUser){
        throw new ApiError(409, "username or email already exist.")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path; // this is imp as coverImage is not mandatory
    

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar image required");
    }

    // upload them to cloudinary, avatar
    const avatarLink = await uploadOnCloudinary(avatarLocalPath)
    const coverImageLink = await uploadOnCloudinary(coverImageLocalPath)

    
    if(!avatarLink){
        throw new ApiError(400, "avatar image required (cloudinary)");
    }

    // create user object - create entry in db
    const user = await User.create({
        email: email,
        username: username.toLowerCase(),
        fullName: fullName,
        password: password,
        avatar: avatarLink.url,
        coverImage: coverImageLink?.url || ""
    })

    // check for user creation
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"    // used '-' to don't take these fields all other fields are taken
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // return response
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )


})

export {registerUser}