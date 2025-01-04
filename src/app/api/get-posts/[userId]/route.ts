import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import Post from "@/model/Post";
import User from "@/model/User";
import { authOptions } from "../../auth/[...nextauth]/options";
import mongoose from "mongoose";

export async function GET(request: Request, { params }: { params:  Promise<{ userId: string }> }) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    const sessionUserId = session?.user?._id;
    const { userId } = await params;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "User ID is required" }),
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select("privacy friends");
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404 }
      );
    }

    const isSelf = sessionUserId === userId;
    const sessionUserObjectId = new mongoose.Types.ObjectId(sessionUserId);
    const isFriend = user.friends?.some(friendId =>
      friendId.equals(sessionUserObjectId)
    );

    const shouldShowPosts =
      isSelf || user.privacy === "public" || isFriend;
    if (!shouldShowPosts) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "This user's posts are private",
        }),
        { status: 403 }
      );
    }

    const posts = await Post.find({
      userId,
      ...(isSelf ? {} : { privacy: "public" }), 
    })
      .sort({ createdAt: -1 }) 

    return new Response(
      JSON.stringify({
        success: true,
        posts,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
