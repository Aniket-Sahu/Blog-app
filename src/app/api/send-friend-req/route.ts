import dbConnect from "@/lib/dbConnect";
import { authOptions } from "../auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import User from "@/model/User";
import mongoose from "mongoose";
import FriendRequest from "@/model/FriendRequest";

export async function POST(request: Request) {
  await dbConnect();
  const { toUserId, isPublic } = await request.json();
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401 }
      );
    }

    const userId = session.user._id;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "User ID not found" }),
        { status: 400 }
      );
    }

    if (!toUserId || typeof isPublic !== "boolean") {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid input data" }),
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const toUserObjectId = new mongoose.Types.ObjectId(toUserId);

    const user = await User.findById(userObjectId);
    const targetUser = await User.findById(toUserObjectId);

    if (!targetUser) {
      return new Response(
        JSON.stringify({ success: false, message: "Target user not found" }),
        { status: 404 }
      );
    }

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404 }
      );
    }

    if (user.privacy === "private" && targetUser.privacy === "public") {
      if (user.friends.includes(toUserId)) {
        return new Response(
          JSON.stringify({ success: false, message: "Already friends" }),
          { status: 400 }
        );
      }

      user.friends.push(toUserObjectId);
      targetUser.friends.push(userObjectId);

      await user.save();
      await targetUser.save();

      return new Response(
        JSON.stringify({ success: true, message: "Friend added successfully" }),
        { status: 200 }
      );
    }

    if (user.privacy === "private" && targetUser.privacy === "private") {
      const existingRequest = await FriendRequest.findOne({
        senderId: userObjectId,
        receiverId: toUserObjectId,
      });

      if (existingRequest?.status === "pending") {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Friend request already sent",
          }),
          { status: 400 }
        );
      }

      await FriendRequest.create({
        senderId: userObjectId,
        receiverId: toUserObjectId,
        status: "pending",
      });

      return new Response(
        JSON.stringify({ success: true, message: "Friend request sent" }),
        { status: 200 }
      );
    }

    // Case where a public user sends a friend request to a private user
    if (user.privacy === "public" && targetUser.privacy === "private") {
      const existingRequest = await FriendRequest.findOne({
        senderId: userObjectId,
        receiverId: toUserObjectId,
      });

      if (existingRequest?.status === "pending") {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Friend request already sent",
          }),
          { status: 400 }
        );
      }

      await FriendRequest.create({
        senderId: userObjectId,
        receiverId: toUserObjectId,
        status: "pending",
      });

      return new Response(
        JSON.stringify({ success: true, message: "Friend request sent" }),
        { status: 200 }
      );
    }

    // Default case: Public user sends friend request to another public user (Friend request creation)
    if (user.privacy === "public" && targetUser.privacy === "public") {
      if (user.friends.includes(toUserId)) {
        return new Response(
          JSON.stringify({ success: false, message: "Already friends" }),
          { status: 400 }
        );
      }

      user.friends.push(toUserObjectId);
      targetUser.friends.push(userObjectId);

      await user.save();
      await targetUser.save();

      return new Response(
        JSON.stringify({ success: true, message: "Friend added successfully" }),
        { status: 200 }
      );
    }

  } catch (error) {
    console.error("Error handling friend action:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while processing the request",
      }),
      { status: 500 }
    );
  }
}
