import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import mongoose from "mongoose";
import Post from "@/model/Post";

export async function DELETE(
  request: Request,
  { params }: { params:  Promise<{ postId: string }> }
) {
  await dbConnect();
  const { postId } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401 }
      );
    }

    const userId = new mongoose.Types.ObjectId(session.user._id);
    const post = await Post.findById(postId);

    if (!post) {
      return new Response(
        JSON.stringify({ success: false, message: "Post not found" }),
        { status: 404 }
      );
    }

    if (!post.userId.equals(userId)) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authorized to delete this post" }),
        { status: 403 }
      );
    }

    await Post.findByIdAndDelete(postId);
    return new Response(
      JSON.stringify({ success: true, message: "Post deleted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting post:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
