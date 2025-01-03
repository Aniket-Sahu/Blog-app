import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import User from "@/model/User";

export async function PATCH(
  request: Request,
  { params }: { params:  Promise<{ userId: string }> }
) {
  await dbConnect();
  const { userId } = await params;

  try {
    const session = await getServerSession(authOptions);
    const { username, bio, isPublic } = await request.json();

    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401 }
      );
    }

    if (userId !== session.user._id) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 403 }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "User ID not found" }),
        { status: 400 }
      );
    }

    const userProfile = await User.findById(userId).select(
      "username bio privacy"
    );

    if (!userProfile) {
      return new Response(
        JSON.stringify({ success: false, message: "User profile not found" }),
        { status: 404 }
      );
    }

    if (typeof username !== "string" || username.trim() === "") {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid username" }),
        { status: 400 }
      );
    }

    if (typeof bio !== "string") {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid bio" }),
        { status: 400 }
      );
    }

    if (typeof isPublic !== "boolean") {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid privacy setting" }),
        { status: 400 }
      );
    }

    console.log(userProfile.privacy);
    console.log(isPublic);
    
    userProfile.username = username;
    userProfile.bio = bio;
    userProfile.privacy = isPublic ? "public" : "private";
    await userProfile.save();

    console.log(userProfile.privacy);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Profile edited successfully",
        user: {
          id: userProfile._id,
          username: userProfile.username,
          bio: userProfile.bio,
          privacy: userProfile.privacy,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error editing user profile:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

export async function GET(request: Request, { params }: { params:  Promise<{ userId: string }> }) {
  await dbConnect();
  const { userId } = await params;
  try {
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "User ID is required" }),
        { status: 400 }
      );
    }

    const userProfile = await User.findById(userId).select("_id username bio privacy");

    if (!userProfile) {
      return new Response(
        JSON.stringify({ success: false, message: "User profile not found" }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          id: userProfile._id,
          username: userProfile.username,
          bio: userProfile.bio,
          privacy: userProfile.privacy,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

