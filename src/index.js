// require('dotenv').config({ path: './env'})  // this is the way which works in both commonJS and module 
import "dotenv/config" // this is the modern way where config is automatically done and the best use this only


import ConnectDB from "./db/index.js";
import { app } from "./app.js";

ConnectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port: ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MongoDB failed to connect !!!  error: ", err);
})









/*

import express from "express";

const app = express();

;(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        
        app.on("error", (error) => {
            console.log("Error: ", error)
            throw err
        })

        app.listen(process.env.PORT, () => {
            console.log(`server is running on port ${process.env.PORT}`)
        })

    } catch (error) {
        console.error("ERROR : ", error)
        throw err
    }
})()

*/

