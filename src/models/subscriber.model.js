import { Timestamp } from "mongodb";
import mongoose, {Schema} from "mongoose";

const SubscriptionSchema = Schema( 
    {
        subscribers: {
            type: Schema.Types.ObjectId, // one who is subscribing
            ref: "User"  
        },
        channel: {
            type: Schema.Types.ObjectId, // one to whom 'subscriber' is subscribing
            ref: "User"
        }

    }, {timestamp: true})

export const Subscription = mongoose.model("Subscription", SubscriptionSchema)