import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import jwt from "jsonwebtoken"

// this is function to get refresh and access tokens
const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false}) 

        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}

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

const loginUser = asyncHandler( async (req, res) => {
    // req.body -> data
    // username or email
    // find user
    // password check 
    // refersh and access token
    // send cookie

    const {username, email, password} = req.body;

    if( !(username || email) ){
        throw new ApiError(400, "username or email is required.")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User not found!!");
    }

    const iscorrect = await user.isPasswordCorrect(password);

    if(!iscorrect){
        throw new ApiError(401, "Password is incorrect!!");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select( "-password -refreshToken" )

    const options = {
        httpOnly: true,   // accessed by server only not by javaScript
        secure: true      // secure
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "Logged IN successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    // update user refreshToken in DB
    // clear cookies both access and refresh

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined}
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged Out")
    )

})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if(!user){
        throw new ApiError(401, "Invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401, "Refresh Token is expired or used")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {accessToken, refreshToken},
            "Refreshed access token successfully"
        )
    )


})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}