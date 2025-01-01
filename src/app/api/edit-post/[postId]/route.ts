import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import mongoose from "mongoose";
import Post from "@/model/Post";

export async function PATCH(
  request: Request,
  { params }: { params:  Promise<{ postId: string }> }
) {
  const { postId } = await params;
  await dbConnect();
  const { title, content, isPublic } = await request.json();

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
        JSON.stringify({ success: false, message: "Not authorized to edit this post" }),
        { status: 403 }
      );
    }

    post.title = title;
    post.content = content;
    post.privacy = isPublic ? "public" : "private";
    post.updatedAt = new Date();

    await post.save();

    return new Response(
      JSON.stringify({ success: true, message: "Post edited successfully", post }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error editing post:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
