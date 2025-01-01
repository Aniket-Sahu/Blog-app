import {IPost} from "@/model/Post";
import { IUser } from "@/model/User";

export interface ApiResponse{
    success: boolean,
    message: string,
    posts?: Array<IPost>,
    users?: Array<IUser>,
    friends? : Array<IUser>
};