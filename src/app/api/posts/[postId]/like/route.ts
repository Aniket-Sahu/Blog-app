import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import Post from "@/model/Post";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";

export async function POST(
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

    const user = session.user;
    if (!user._id) {
      return new Response(
        JSON.stringify({ success: false, message: "User ID not found" }),
        { status: 400 }
      );
    }

    const userId = new mongoose.Types.ObjectId(session.user._id);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid post ID format" }),
        { status: 400 }
      );
    } 

    const post = await Post.findById(postId);

    if (!post) {
      return new Response(
        JSON.stringify({ success: false, message: "Post not found" }),
        { status: 404 }
      );
    }

    if (post.likes.includes(userId)) {
      return new Response(
        JSON.stringify({ success: false, message: "Post already liked" }),
        { status: 400 }
      );
    }

    post.likes.push(userId);
    await post.save();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Like added successfully",
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error liking post:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

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

    const user = session.user;

    if (!user._id) {
      return new Response(
        JSON.stringify({ success: false, message: "User ID not found" }),
        { status: 400 }
      );
    }

    const userId = new mongoose.Types.ObjectId(session.user._id);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid post ID format" }),
        { status: 400 }
      );
    }

    const post = await Post.findById(postId);

    if (!post) {
      return new Response(
        JSON.stringify({ success: false, message: "Post not found" }),
        { status: 404 }
      );
    }

    if (!post.likes.includes(userId)) {
      return new Response(
        JSON.stringify({ success: false, message: "Post wasn't liked" }),
        { status: 400 }
      );
    }

    post.likes = post.likes.filter((id) => !id.equals(userId));
    await post.save();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Like removed successfully",
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error unliking post:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
