import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import Comment from "@/model/Comment";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";

export async function DELETE(
  request: Request,
  { params }: { params:  Promise<{ postId: string, commentId: string }> }
) {
  await dbConnect();
  const { postId, commentId } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401 }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(postId) ||
      !mongoose.Types.ObjectId.isValid(commentId)
    ) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid ID(s)" }),
        { status: 400 }
      );
    }

    const userId = new mongoose.Types.ObjectId(session.user._id);
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return new Response(
        JSON.stringify({ success: false, message: "Comment not found" }),
        { status: 404 }
      );
    }

    if (!comment.userId.equals(userId)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Not authorized to delete this comment",
        }),
        { status: 403 }
      );
    }

    await Comment.findByIdAndDelete(commentId);
    return new Response(
      JSON.stringify({ success: true, message: "Post deleted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting  Comment:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
