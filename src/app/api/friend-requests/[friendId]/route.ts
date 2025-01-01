import dbConnect from "@/lib/dbConnect";
import { getServerSession, User } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import mongoose from "mongoose";
import FriendRequest from "@/model/FriendRequest";
import UserModel from "@/model/User";

export async function POST(
  request: Request,
  { params }: { params:  Promise<{ friendId: string }> }
) {
  await dbConnect();
  const { friendId } = await params;
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
    const friendIdObj = new mongoose.Types.ObjectId(friendId);
    const friendReq = await FriendRequest.findOne({
      senderId: friendIdObj,
      receiverId: userId,
    });

    if (!friendReq) {
      return new Response(
        JSON.stringify({ success: false, message: "Friend request not found" }),
        { status: 404 }
      );
    }

    if (friendReq.status !== "pending") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Friend request already processed",
        }),
        { status: 400 }
      );
    }

    friendReq.status = "accepted";
    await friendReq.save();

    await Promise.all([
      UserModel.findByIdAndUpdate(
        userId,
        { $addToSet: { friends: friendIdObj } },
        { new: true }
      ),
      UserModel.findByIdAndUpdate(
        friendIdObj,
        { $addToSet: { friends: userId } },
        { new: true }
      ),
    ]);

    return new Response(
      JSON.stringify({ success: true, message: "Friend request accepted" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params:  Promise<{ friendId: string }> }
) {
  await dbConnect();
  const { friendId } = await params;
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
    const friendIdObj = new mongoose.Types.ObjectId(friendId);
    const friendReq = await FriendRequest.findOne({
      senderId: friendIdObj,
      receiverId: userId,
    });

    if (!friendReq) {
      return new Response(
        JSON.stringify({ success: false, message: "Friend request not found" }),
        { status: 404 }
      );
    }

    if (friendReq.status !== "pending") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Friend request already processed",
        }),
        { status: 400 }
      );
    }

    friendReq.status = "rejected";
    await friendReq.save();

    await Promise.all([
      UserModel.findByIdAndUpdate(
        userId,
        { $pull: { friends: friendIdObj } },
        { new: true }
      ),
      UserModel.findByIdAndUpdate(
        friendIdObj,
        { $pull: { friends: userId } }, 
        { new: true }
      )
    ]);    

    return new Response(
      JSON.stringify({ success: true, message: "Friend request rejected" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
