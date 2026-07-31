import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {deleteFromCloudinary, getPublicIdFromUrl, uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import jwt from "jsonwebtoken"
import { Subscription } from "../models/subscriber.model.js"
import mongoose from "mongoose"

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

const changeCurrentPassword = asyncHandler( async (req, res) => {

    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id) // this is imp as req.user only content _id 

    const iscorrect = await user.isPasswordCorrect(oldPassword)

    if(!iscorrect){
        throw new ApiError(400, "Incorrect Password!!");
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully."
        )
    )
})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "user fetched successfully"
        )
    )
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    
    const {fullName, email} = req.body
    
    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{ // set is imp
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    )
    .select( "-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "data updated successfully"
        )
    )

})

const updateAvatar = asyncHandler(async (req, res) => {

    // Get avatar image path from multer
    const avatarLocalPath = req.file?.path;

    // Check if file is provided
    if (!avatarLocalPath) {
        throw new ApiError(404, "Insert Avatar Image");
    }

    // Get existing user from database
    const existingUser = await User.findById(req.user._id);

    // Upload new avatar to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Check if upload was successful
    if (!avatar?.url) {
        throw new ApiError(400, "Error while uploading avatar.");
    }

    // Update avatar URL in database
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password");

    // Delete old avatar from Cloudinary (if it exists)
    if (existingUser.avatar) {
        const publicId = getPublicIdFromUrl(existingUser.avatar);
        await deleteFromCloudinary(publicId);
    }

    // Send response
    return res.status(200).json(
        new ApiResponse(
            200,
            updatedUser,
            "Avatar updated successfully"
        )
    );
});

const updateCoverImage = asyncHandler(async (req, res) => {

    // Get cover image path from multer
    const coverImageLocalPath = req.file?.path;

    // Check if file is provided
    if (!coverImageLocalPath) {
        throw new ApiError(404, "Insert Cover Image");
    }

    // Get existing user from database
    const existingUser = await User.findById(req.user._id);

    // Upload new cover image to Cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // Check if upload was successful
    if (!coverImage?.url) {
        throw new ApiError(400, "Error while uploading cover image.");
    }

    // Update cover image URL in database
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password");

    // Delete old cover image from Cloudinary (if it exists)
    if (existingUser.coverImage) {
        const publicId = getPublicIdFromUrl(existingUser.coverImage);
        await deleteFromCloudinary(publicId);
    }

    // Send response
    return res.status(200).json(
        new ApiResponse(
            200,
            updatedUser,
            "Cover image updated successfully"
        )
    );
});

const getUserChannelProfile = asyncHandler( async (req, res) => {

    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscribers",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel not found!!")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "User Channel fetched successfully"
        )
    )
});

const getWatchedHistory = asyncHandler( async (req, res) => {
    
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }

                ]
                
            }
        }
    ])

    if (!user.length) {
        throw new ApiError(404, "User not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "WatchHistory fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchedHistory
}