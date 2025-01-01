import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import mongoose from "mongoose";
import User from "@/model/User";

export async function DELETE(
    request: Request,
    { params }: { params:  Promise<{ friendId: string }> }
  ) {
    await dbConnect();
    const { friendId } = await params;
  
    try {
      const session = await getServerSession(authOptions);
  
      if (!session || !session.user) {
        return new Response(
          JSON.stringify({ success: false, message: "Not authenticated" }),
          { status: 401 }
        );
      }
  
      const userId = new mongoose.Types.ObjectId(session.user._id);
  
      const result = await User.findByIdAndUpdate(
        userId,
        { $pull: { friends: new mongoose.Types.ObjectId(friendId) } },
        { new: true } 
      ).exec();
  
      if (!result) {
        return new Response(
          JSON.stringify({ success: false, message: "User not found" }),
          { status: 404 }
        );
      }
  
      return new Response(
        JSON.stringify({ success: true, message: "Friend removed successfully" }),
        { status: 200 }
      );
    } catch (error) {
      console.error("Error removing friend:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Internal Server Error" }),
        { status: 500 }
      );
    }
  }
  