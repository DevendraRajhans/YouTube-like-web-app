import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();


// following are major configurations 
app.use(cors({
    origin: process.env.CORS_ORIGIN,  // for not it is * (from everywhere) but you should change it with vercel or anything's url
    credentials: true
}))
app.use(express.json({limit: "16kb"})) // setting for data coming as json (size limit for json data can be recieved)
app.use(express.urlencoded({extended: true, limit: "16kb"})) // setting for data coming from url
app.use(express.static("public")) // static assets like images , favicon from folders (we here created public folder where we are going to add static data)
app.use(cookieParser()) // to access and set cookies of browser


import userRouter from "./routes/user.route.js"

app.use("/api/v1/users", userRouter)

// http://localhost:8000/api/v1/users/register
export { app }