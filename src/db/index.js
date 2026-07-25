import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";  //  .js is imp sometimes

const ConnectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !!! DB host : ${connectionInstance.connection.host}`);
    }
    catch (error){
        console.error("MongoDB connection error: ", error);
        process.exit(1);
    }
}

export default ConnectDB;