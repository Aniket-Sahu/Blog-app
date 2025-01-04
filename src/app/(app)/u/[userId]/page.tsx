"use client";

import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Post } from "@/schemas/postSchema";
import { Profile } from "@/schemas/profileSchema";
import { ApiResponse } from "@/types/ApiResponse";
import axios, { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { use } from "react";
import { Comment } from "@/schemas/commentSchema";

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
  const [likedPosts, setLikedPosts] = useState<Map<string, boolean>>(new Map());
  const [openComment, setOpenComment] = useState<Map<string, boolean>>(
    new Map()
  );
  const [baseUrl, setBaseUrl] = useState("");
  const [comments, setComments] = useState<Map<string, Comment[]>>(new Map());
  const [comment, setComment] = useState<Map<string, string>>(new Map());

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

  useEffect(() => {
    fetchUserFriends();
    const url = `${window.location.protocol}//${window.location.host}`;
    setBaseUrl(url);
  }, []);

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

        if (isFriend) {
          setIsFriend(true);
        }

        if (isPublic || isFriend) {
          setIsLoading(true);
          try {
            const response = await axios.get(`/api/get-posts/${userId}`);
            const fetchedPosts = response.data.posts || [];
            setPosts(fetchedPosts);
            const likedMap = new Map<string, boolean>();
            fetchedPosts.forEach((post: Post) => {
              likedMap.set(
                post?._id as string,
                Array.isArray(post.likes) &&
                  post.likes.includes(user?._id as string)
              );
            });
            setLikedPosts(likedMap);
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
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred fetching the profile",
          variant: "destructive",
        });
      }
    };

    if (userFriends.length === 0) {
      fetchUserFriends();
    }
    getProfileAndPosts();
    console.log(userprofile);
  }, [userId, toast]);

  const handleLikeToggle = async (postId: string) => {
    setLikedPosts((prev) => {
      const updated = new Map(prev);
      updated.set(postId, !prev.get(postId));
      return updated;
    });

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === postId
          ? {
              ...post,
              likes: Array.isArray(post.likes)
                ? post.likes.includes(user?._id as string)
                  ? post.likes.filter((id) => id !== user?._id)
                  : [...post.likes, user?._id as string]
                : [user?._id as string],
            }
          : post
      )
    );

    try {
      const post = posts.find((post) => post._id === postId);
      if (!post || !Array.isArray(post.likes)) {
        throw new Error("Post not found or likes is not a valid array");
      }
      if (post.likes.includes(user?._id as string)) {
        await axios.delete(`/api/posts/${postId}/like`);
      } else {
        await axios.post(`/api/posts/${postId}/like`);
      }
      fetchUserFriends();
    } catch (error) {
      setLikedPosts((prev) => {
        const updated = new Map(prev);
        updated.set(postId, !prev.get(postId));
        return updated;
      });
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: Array.isArray(post.likes)
                  ? post.likes.includes(user?._id as string)
                    ? [...post.likes, user?._id as string]
                    : post.likes.filter((id) => id !== user?._id)
                  : post.likes,
              }
            : post
        )
      );
      toast({
        title: "Error",
        description: "An error occurred liking or unliking the post",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log(userprofile);
  }, [userprofile]);

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
        setIsFriend(true);
        toast({
          title: "Friend added",
          description: "Friend added successfully.",
        });
      } else {
        setIsFriend(true);
        toast({
          title: "Request Sent",
          description: "Friend request sent successfully",
        });
      }
      fetchUserFriends();
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
      setIsFriend(false);
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

  const handleCommentToggle = (postId: string) => {
    const isCurrentlyOpen = openComment.get(postId) || false;
    setOpenComment((prev) => {
      const updated = new Map(prev);
      updated.set(postId, !isCurrentlyOpen);
      return updated;
    });
    if (!isCurrentlyOpen) {
      getComment(postId);
    }
  };

  const getComment = async (postId: string) => {
    try {
      const response = await axios.get(`/api/posts/${postId}/comments`);
      if (response.data.comments.length === 0) {
        toast({
          title: "success",
          description: "no comments",
        });
      }
      const rawComments = response.data.comments;
      const formattedComments = rawComments.map((comment: any) => ({
        ...comment,
        username: comment.userId.username,
        userId: comment.userId._id,
      }));
      setComments((prev) => {
        const updated = new Map(prev);
        updated.set(postId, formattedComments);
        return updated;
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "error",
        description:
          axiosError.response?.data.message ||
          "An error occurred fetching comments",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    try {
      const content = comment.get(postId);
      if (!content || typeof content !== "string") {
        throw new Error("Invalid comment content");
      }
      const response = await axios.post(`/api/posts/${postId}/comments`, {
        content,
      });
      const { comment: newComment } = response.data;
      setComments((prev) => {
        const updated = new Map(prev);
        const existingComments = updated.get(postId) || [];
        updated.set(postId, [newComment, ...existingComments]);
        return updated;
      });
      setComment((prev) => {
        const updated = new Map(prev);
        updated.set(postId, "");
        return updated;
      });
      toast({
        title: "success",
        description: "comment posted successfully",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "error",
        description:
          axiosError.response?.data.message ||
          "An error occurred adding comments",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      const response = await axios.delete(
        `/api/posts/${postId}/comments/${commentId}`
      );
      setComments((prev) => {
        const updated = new Map(prev);
        const existingComments = updated.get(postId) || [];
        updated.set(
          postId,
          existingComments.filter((comment) => comment._id !== commentId)
        );
        return updated;
      });
      toast({
        title: "success",
        description: response.data.message || "Comment deleted successfully",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "error",
        description:
          axiosError.response?.data.message ||
          "An error occurred deleting comment",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (postId: string) => {
    if (!baseUrl) return;
    const postUrl = `${baseUrl}/u/${user?.username}/${postId}`;
    navigator.clipboard.writeText(postUrl);
    toast({
      title: "URL Copied!",
      description: "Post URL has been copied to clipboard.",
    });
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
              {userprofile?.privacy === "public"
                ? "Remove Friend"
                : "Remove Request"}
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
                    <div className="mt-2 flex space-x-2">
                      {/* Like Button */}
                      <button
                        onClick={() => handleLikeToggle(post._id as string)}
                        className="w-10 h-10 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center shadow-md transition-transform transform hover:scale-105 active:scale-95"
                      >
                        {likedPosts.get(post?._id as string) ? "❤️" : "🤍"}
                      </button>

                      {/* Comment Button */}
                      <button
                        onClick={() => handleCommentToggle(post._id as string)}
                        className="w-10 h-10 bg-green-100 hover:bg-green-200 text-green-600 rounded-full flex items-center justify-center shadow-md transition-transform transform hover:scale-105 active:scale-95"
                      >
                        💬
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => handleShare(post._id as string)}
                        className="w-10 h-10 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-full flex items-center justify-center shadow-md transition-transform transform hover:scale-105 active:scale-95"
                      >
                        🔗
                      </button>
                    </div>
                    {openComment.get(post?._id as string) && (
                      <div className="mt-4 border-t pt-4">
                        {/* Add Comment Section */}
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={comment.get(post?._id as string) || ""}
                            onChange={(e) => {
                              const updatedComments = new Map(comment);
                              updatedComments.set(
                                post?._id as string,
                                e.target.value
                              );
                              setComment(updatedComments);
                            }}
                            className="flex-grow border border-slate-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                          <button
                            onClick={() => handleAddComment(post._id as string)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                          >
                            Add Comment
                          </button>
                        </div>

                        {/* List of Comments */}
                        <div className="mt-4 space-y-4">
                          {comments.get(post?._id as string)?.map((comment) => (
                            <div
                              key={comment._id}
                              className="flex items-start justify-between"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {comment.username}
                                </p>
                                <p className="text-slate-600">
                                  {comment.content}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {comment.createdAt
                                    ? new Date(
                                        comment.createdAt
                                      ).toLocaleString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "numeric",
                                        minute: "numeric",
                                        second: "numeric",
                                        hour12: true,
                                      })
                                    : "No date available"}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  handleDeleteComment(
                                    post._id as string,
                                    comment._id
                                  )
                                }
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
