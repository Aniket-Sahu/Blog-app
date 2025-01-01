import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import Post from "@/model/Post";
import mongoose from "mongoose";

export async function POST(request: Request) {
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

    const user = session.user;

    if (!user._id) {
      return new Response(
        JSON.stringify({ success: false, message: "User ID not found" }),
        { status: 400 }
      );
    }

    if (!title || !content || typeof isPublic !== "boolean") {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid input data" }),
        { status: 400 }
      );
    }

    const newPost = new Post({
      userId: new mongoose.Types.ObjectId(user._id),
      title,
      content,
      privacy: isPublic ? "public" : "private",
      likes: [],
      comments: [],
    });

    await newPost.save();
    return new Response(
      JSON.stringify({
        success: true,
        message: "Post added successfully",
        post: newPost,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding post:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
