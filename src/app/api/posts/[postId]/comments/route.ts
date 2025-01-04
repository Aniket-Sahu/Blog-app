import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import Post from "@/model/Post";
import Comment from "@/model/Comment";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  await dbConnect();
  const { postId } = await params;
  const { content } = await request.json();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid Post ID" }),
        { status: 400 }
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

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, message: "Comment cannot be empty" }),
        { status: 400 }
      );
    }

    const newComment = new Comment({
      userId,
      postId,
      content: content,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newComment.save();
    await newComment.populate("userId", "username");

    const newUpdatedComment = {
      ...newComment.toObject(),
      createdAt: new Date(newComment.createdAt),
      updatedAt: new Date(newComment.updatedAt),
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "comment posted",
        comment: newUpdatedComment,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error posting comment", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
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

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid Post ID" }),
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

    const comments = await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .populate("userId", "username");

    if (comments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No comments found",
          comments: [], 
        }),
        { status: 200 }
      );
    }

    const formattedComments = comments.map((comment) => ({
      ...comment.toObject(),
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
    }));

    return new Response(JSON.stringify({ comments: formattedComments }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
