"use client";

// now what's left is comments, and share (which will be a copy link until later changes) -> Do it on 4th Jan

import { useToast } from "@/hooks/use-toast";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Post, postSchema } from "@/schemas/postSchema";
import { signOut, useSession } from "next-auth/react";
import { Profile, profileSchema } from "@/schemas/profileSchema";
import { ApiResponse } from "@/types/ApiResponse";
import { useDebounceCallback } from "usehooks-ts";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Comment } from "@/schemas/commentSchema";

const page = () => {
  const router = useRouter();
  const [isSearchLoading, setIsSearchLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const { data: session } = useSession();
  const user = session?.user;
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [likedPosts, setLikedPosts] = useState<Map<string, boolean>>(new Map());
  const [openComment, setOpenComment] = useState<Map<string, boolean>>(
    new Map()
  );
  const [baseUrl, setBaseUrl] = useState("");
  const [comments, setComments] = useState<Map<string, Comment[]>>(new Map());
  const [comment, setComment] = useState<Map<string, string>>(new Map());

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
      isPublic: "public",
    },
  });

  const userForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      bio: user?.bio || "",
      privacy: user?.privacy || "public",
    },
  });

  const fetchPosts = useCallback(
    async (refresh: boolean = false) => {
      setIsLoading(true);
      try {
        const response = await axios.get("/api/get-posts-user");
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
        if (refresh) {
          toast({
            title: "Refreshed posts",
            description: "Showing latest posts",
          });
        }
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse>;
        toast({
          title: "error",
          description:
            axiosError.response?.data.message ||
            "An error occurred fetching posts",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setPosts, setLikedPosts, user, toast]
  );

  const handleDeletePost = async (postId: string) => {
    setPosts(posts.filter((post) => post._id !== postId));
    try {
      const response = await axios.delete(`/api/delete-post/${postId}`);
      toast({
        title: "success",
        description: response.data.message,
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "error",
        description:
          axiosError.response?.data.message ||
          "An error occurred deleting post",
        variant: "destructive",
      });
    }
  };

  const debouncedSearch = useDebounceCallback(async (query: string) => {
    setIsSearchLoading(true);
    if (query) {
      try {
        const response = await axios.get(`/api/search-users?query=${query}`);
        setUsers(response.data.users);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    } else {
      setUsers([]);
      setIsSearchLoading(false);
    }
  }, 500);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    debouncedSearch(event.target.value);
  };

  const handleFriendsClick = () => {
    router.push("/u/friends");
  };

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
                  ? post.likes.filter((id) => id !== user?._id) // Unlike
                  : [...post.likes, user?._id as string] // Like
                : [user?._id as string], // Handle undefined likes
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

  const handleFriendRequestsClick = async () => {
    router.push("/u/friend-requests");
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

  const onSubmit = async (post: z.infer<typeof postSchema>) => {
    const isPublic = post.isPublic === "public";
    const requestData = {
      ...post,
      isPublic,
    };
    try {
      const response = await axios.post("/api/add-post", requestData);
      toast({
        title: "Success",
        description: response.data.message,
      });
      fetchPosts();
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      const errorMessage =
        axiosError.response?.data.message ?? "Note addition failed";
      toast({
        title: "Note addition failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditPost = async (
    post: z.infer<typeof postSchema>,
    postId: string
  ) => {
    const isPublic = post.isPublic === "public";
    const requestData = {
      ...post,
      isPublic,
      postId,
    };
    try {
      const response = await axios.patch(
        `/api/edit-post/${postId}`,
        requestData
      );
      toast({
        title: "Success",
        description: response.data.message,
      });
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === post._id ? response.data.post : post
        )
      );
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message || "An error occurred editing post",
        variant: "destructive",
      });
    }
  };

  const handleEditProfile = async (profile: z.infer<typeof profileSchema>) => {
    const isPublic = profile.privacy === "public";
    const requestData = {
      ...profile,
      isPublic,
    };
    try {
      const response = await axios.patch(
        `/api/profile/${user?._id}`,
        requestData
      );
      toast({
        title: "Success",
        description: response.data.message,
      });
      if (user) {
        user.username = response.data.user.username;
        user.bio = response.data.user.bio;
        user.privacy = response.data.user.privacy;
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ||
          "An error occurred editing profile",
        variant: "destructive",
      });
    }
    setIsEditingProfile(false);
  };

  const openUserProfile = (userId: string) => {
    router.push(`/u/${userId}`);
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  useEffect(() => {
    const url = `${window.location.protocol}//${window.location.host}`;
    setBaseUrl(url);
  }, []);

  useEffect(() => {
    if (!session || !session.user) return;
    fetchPosts();
  }, [session, toast, fetchPosts]);

  return (
    <div className="flex h-screen">
      {/* Left Side - Main Area */}
      <div className="w-3/4 bg-slate-50 p-6">
        <Button
          className="absolute top-6 left-[calc(100%-32%)] text-lg font-semibold"
          onClick={handleLogout}
        >
          Logout
        </Button>
        <h2
          className="absolute top-6 left-[calc(100%-38%)] text-lg font-semibold text-blue-600 cursor-pointer hover:underline"
          onClick={handleFriendsClick}
        >
          Friends
        </h2>
        {user?.privacy === "private" && (
          <h2
            className="absolute top-6 left-[calc(100%-48%)] text-lg font-semibold text-blue-600 cursor-pointer hover:underline"
            onClick={handleFriendRequestsClick}
          >
            Friend Requests
          </h2>
        )}

        {/* Username and Bio */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            {user?.username}
          </h1>
          <h2 className="text-xl font-medium text-slate-700">{user?.bio}</h2>
        </div>
        <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
          <DialogTrigger asChild>
            <Button className="absolute top-6 left-[calc(100%-58%)] text-lg font-semibold">
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Edit your Profile</DialogTitle>
            <Form {...userForm}>
              <form
                onSubmit={userForm.handleSubmit(handleEditProfile)}
                className="space-y-6"
              >
                <FormField
                  name="username"
                  control={userForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <Input placeholder={user?.username} {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="bio"
                  control={userForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <Input placeholder={user?.bio} {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="privacy"
                  control={userForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Privacy</FormLabel>
                      <select
                        className="border rounded-md p-2"
                        {...field}
                        value={field.value || "public"}
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit">
                  Save
                </Button>
              </form>
            </Form>

            <Button onClick={() => setIsEditingProfile(false)}>Close</Button>
          </DialogContent>
        </Dialog>

        {/* Separator */}
        <Separator className="my-4" />
        {/* Add Post Button */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 mb-4">Add Post</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Add New Post</DialogTitle>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  name="title"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <Input placeholder="Enter Post's title" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="content"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <Input placeholder="Enter Post's content" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="privacy"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Privacy</FormLabel>
                      <select className="border rounded-md p-2" {...field}>
                        <option value="public">Public</option>{" "}
                        <option value="private">Private</option>{" "}
                      </select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  className="w-full"
                  type="submit"
                  onClick={() => setIsOpen(false)}
                >
                  Add
                </Button>
              </form>
            </Form>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </DialogContent>
        </Dialog>

        <div className="space-y-6">
          {posts.map((post) => (
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
                            <p className="text-slate-600">{comment.content}</p>
                            <p className="text-xs text-slate-400">
                              {comment.createdAt
                                ? new Date(comment.createdAt).toLocaleString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "numeric",
                                      second: "numeric",
                                      hour12: true,
                                    }
                                  )
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
              {/* Three-dot Menu */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() =>
                    setShowPostMenu(
                      showPostMenu === (post._id as string)
                        ? null
                        : (post._id as string)
                    )
                  }
                  className="text-slate-500 hover:text-slate-800"
                >
                  ...
                </button>
                {/* Dropdown Menu */}
                {showPostMenu === post._id && (
                  <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded shadow-lg w-32">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-slate-100"
                      onClick={() => {
                        setIsEditing(post._id as string);
                        setShowPostMenu(null);
                      }}
                    >
                      Edit Post
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-slate-100"
                      onClick={() => handleDeletePost(post._id as string)}
                    >
                      Delete
                    </button>
                  </div>
                )}
                {isEditing === post._id && (
                  <Dialog
                    open={isEditing === post._id}
                    onOpenChange={() => setIsEditing(null)}
                  >
                    <DialogContent>
                      <DialogTitle>Edit Post</DialogTitle>
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit((formData) =>
                            handleEditPost(formData, post._id as string)
                          )}
                          className="space-y-6"
                        >
                          <FormField
                            name="title"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <Input placeholder={post.title} {...field} />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="content"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Content</FormLabel>
                                <Input placeholder={post.content} {...field} />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="isPublic"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Privacy</FormLabel>
                                <select
                                  className="border rounded-md p-2"
                                  {...field}
                                >
                                  <option value="public">Public</option>{" "}
                                  <option value="private">Private</option>{" "}
                                </select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            className="w-full"
                            type="submit"
                            onClick={() => setIsOpen(false)}
                          >
                            Done
                          </Button>
                        </form>
                      </Form>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(null)}
                        className="w-full mt-2"
                      >
                        Close
                      </Button>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Search Users */}
      <div className="w-1/4 bg-slate-100 p-6">
        {/* Search Bar */}
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search users..."
          className="w-full border border-slate-300 rounded-lg px-4 py-2"
        />
        {/* Users List */}
        <div className="mt-4 space-y-4">
          {/* Replace with dynamic users */}
          {users.map((user, index) => (
            <div
              key={index}
              onClick={() => openUserProfile(user._id as string)}
              className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm"
            >
              <p className="text-slate-800 font-medium">{user.username}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default page;
