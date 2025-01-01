import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import User from "@/model/User";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const searchName = url.searchParams.get("query");

    if (!searchName) {
      return new Response(
        JSON.stringify({ success: false, message: "Search query is required" }),
        { status: 400 }
      );
    }

    const users = await User.find({
      username: { $regex: searchName, $options: "i" },
    }).select("_id username bio privacy");

    return new Response(
        JSON.stringify({success: true, users}),
        {status: 200}
    );

  } catch (error) {
    console.error("Error fetching users:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
