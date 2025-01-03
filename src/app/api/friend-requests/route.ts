import dbConnect from "@/lib/dbConnect";
import { getServerSession, User } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import mongoose from "mongoose";
import FriendRequest from "@/model/FriendRequest";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    const user: User = session?.user as User;

    if (!session || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401 }
      );
    }

    const userId = new mongoose.Types.ObjectId(user._id);
    const friendReqs = await FriendRequest.find({
      receiverId: userId,
      status: "pending",
    })
      .populate("senderId", "username")
      .exec();

    return new Response(JSON.stringify({ friendReqs }), { status: 200 });
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
