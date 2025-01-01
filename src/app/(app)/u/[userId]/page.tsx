"use client";

import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Post } from "@/schemas/postSchema";
import { Profile } from "@/schemas/profileSchema";
import axios from "axios";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { use } from "react";

const page = ({ params }: { params: Promise<{ userId: string }> }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const user = session?.user;
  const [userprofile, setUserProfile] = useState<Profile>();
  const { userId } = use(params);
  const [userFriends, setUserFriends] = useState<Profile[]>([]);
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [isCommentOpen, setIsCommentOpen] = useState<boolean>(false);
  // const [likedPosts, setLikedPosts] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    const getProfileAndPosts = async () => {
      try {
        const profileResponse = await axios.get(`/api/profile/${userId}`);
        const profile = profileResponse.data.profile;
        setUserProfile(profile);

        const isPublic = profile.privacy === "public";
        const isFriend = userFriends.some(
          (friend) => friend._id?.toString() === userId.toString()
        );

        if (isPublic || isFriend) {
          setIsLoading(true);
          try {
            const response = await axios.get(`/api/get-posts/${userId}`);
            setPosts(response.data.posts || []);
          } catch (error) {
            toast({
              title: "Error",
              description: "An error occurred fetching posts",
              variant: "destructive",
            });
          } finally {
            setIsLoading(false);
          }
        }
        setIsFriend(isFriend);
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred fetching the profile",
          variant: "destructive",
        });
      }
    };

    const fetchUserFriends = async () => {
      try {
        const response = await axios.get(`/api/friends`);
        setUserFriends(response.data.friends || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred fetching user friends",
          variant: "destructive",
        });
      }
    };
    if (userFriends.length === 0) {
      fetchUserFriends();
    }
    getProfileAndPosts();
  }, [userId, toast, userFriends]);

  const handleLikeToggle = async (postId: string) => {
    try {
      const post = posts.find((post) => post._id === postId);
      if (!post || !Array.isArray(post.likes)) {
        throw new Error("Post not found or likes is not an array");
      }
      if ((post?.likes as string[]).includes(user?._id as string)) {
        await axios.delete(`/api/posts/${postId}/like`);
      } else {
        await axios.post(`/api/posts/${postId}/like`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred liking or unliking the post",
        variant: "destructive",
      });
    }
  };

  const handleAddFriend = async () => {
    try {
      const response = await axios.post(`/api/send-friend-req`, {
        toUserId: userId,
        isPublic: userprofile?.privacy === "public",
      });
      if (!response.data.success) {
        return toast({
          title: "Friend Request Already Sent",
          description: response.data.message,
          variant: "destructive",
        });
      }
      if (userprofile?.privacy === "public") {
        toast({
          title: "Friend added",
          description: "Friend added successfully.",
        });
      } else {
        toast({
          title: "Request Sent",
          description: "Friend request sent successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred sending the friend request.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFriend = async () => {
    try {
      const response = await axios.delete(`/api/remove-friend/${userId}`);
      toast({
        title: "Friend Removed",
        description: response.data.message,
      });
      if (!response.data.success) {
        return toast({
          title: "Error",
          description: response.data.message,
          variant: "destructive",
        });
      }
      toast({
        title: "Friend Removed",
        description: "Friend removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred removing the friend.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Side - Main Area */}
      <div className="w-3/4 bg-slate-50 p-6">
        {/* Username and Bio */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {userprofile?.username}
            </h1>
            <h2 className="text-xl font-medium text-slate-700">
              {userprofile?.bio}
            </h2>
          </div>
          {/* Add Friend / Send Request Button */}
          {!isFriend ? (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-md"
              onClick={handleAddFriend}
            >
              {userprofile?.privacy === "public"
                ? "Add Friend"
                : "Send Request"}
            </button>
          ) : (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-md"
              onClick={handleRemoveFriend}
            >
              Remove Friend
            </button>
          )}
        </div>
        {/* Separator */}
        <Separator className="my-4" />
        {/* Posts Section */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            userprofile?.privacy === "private" ? (
              <>You need to add them to see their posts</>
            ) : (
              <>User has no posts</>
            )
          ) : (
            posts
              .filter((post) => post.privacy === "public")
              .map((post) => (
                <div
                  key={post._id}
                  className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm relative"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {post.title}
                    </h3>
                    <p className="text-slate-600">{post.content}</p>
                    <button
                      onClick={() => handleLikeToggle(post._id as string)}
                      className="mt-2 w-10 h-10 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center shadow-md transition-transform transform hover:scale-105 active:scale-95"
                    >
                      {post.likes?.includes(user?._id as string) ? "❤️" : "🤍"}
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default page;