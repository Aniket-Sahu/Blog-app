import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import mongoose from "mongoose";
import User from "@/model/User";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!session || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401 }
      );
    }

    const dbUser = await User.findById(user._id)
      .populate("friends", "_id username bio privacy") 
      .exec();

    if (!dbUser) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404 }
      );
    }

    const friends = dbUser.friends.map((friend: any) => ({
        _id: friend._id, 
        username: friend.username,
        privacy: friend.privacy,
        bio: friend.bio,
    }));
    
    return new Response(JSON.stringify({ success: true, friends }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
