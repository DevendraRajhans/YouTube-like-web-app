import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verify } from "jsonwebtoken";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([         // this is middleware we are using before controller registerUser
        {                   // we used this to use multer for taking files as input
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),    
    registerUser   // this is controller
)

//secured routes
router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT, logoutUser)

export default router
// as we used default here we can use any name while importing this router in another file.