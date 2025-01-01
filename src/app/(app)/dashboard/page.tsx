"use client";

// Manage likes/dislikes UI
// Friend reqs manage
// comments
// share

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
  const [isCommentOpen, setIsCommentOpen] = useState<boolean>(false);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  // const [likedPosts, setLikedPosts] = useState<Map<string, boolean>>(new Map());

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

  const { register, watch, setValue } = form;

  const fetchPosts = useCallback(
    async (refresh: boolean = false) => {
      setIsLoading(true);
      try {
        const response = await axios.get("/api/get-posts-user");
        setPosts(response.data.posts || []);
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
    [setIsLoading]
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

  const handleEditPost = async (post: z.infer<typeof postSchema>, postId: string) => {
    const isPublic = post.isPublic === "public";
    const requestData = {
      ...post,
      isPublic,
      postId
    };
    try {
      const response = await axios.patch(`/api/edit-post/${postId}`, requestData);
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
    const isPublic = profile.isPublic === "public";
    const requestData = {
      ...profile,
      isPublic,
    };
    try {
      const response = await axios.patch(`/api/profile/${user?._id}`, requestData);
      toast({
        title: "Success",
        description: response.data.message,
      });
      if(user){
        user.username = response.data.user.username;
        user.bio = response.data.user.bio;
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
    if (!session || !session.user) return;
    fetchPosts();
  }, [session, toast, fetchPosts]);

  return (
    <div className="flex h-screen">
      {/* Left Side - Main Area */}
      <div className="w-3/4 bg-slate-50 p-6">
        <h2
          className="absolute top-6 left-[calc(100%-30%)] text-lg font-semibold text-blue-600 cursor-pointer hover:underline"
          onClick={handleFriendsClick}
        >
          Friends
        </h2>
        <Button
          className="absolute top-6 left-[calc(100%-40%)] text-lg font-semibold"
          onClick={handleLogout}
        >
          Logout
        </Button>
        {/* Username and Bio */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            {user?.username}
          </h1>
          <h2 className="text-xl font-medium text-slate-700">{user?.bio}</h2>
        </div>
        <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
          <DialogTrigger asChild>
            <Button className="absolute top-6 left-[calc(100%-50%)] text-lg font-semibold">Edit Profile</Button>
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
                  name="isPublic"
                  control={userForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Privacy</FormLabel>
                      <select
                        className="border rounded-md p-2"
                        {...field}
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
                  name="isPublic"
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

                <Button className="w-full" type="submit" onClick={() => setIsOpen(false)}>
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
                <button
                  onClick={() => handleLikeToggle(post._id as string)}
                  className="mt-2 w-10 h-10 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center shadow-md transition-transform transform hover:scale-105 active:scale-95"
                >
                  {post.likes?.includes(user?._id as string) ? "❤️" : "🤍"}
                </button>
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
                          onSubmit={form.handleSubmit((formData) => handleEditPost(formData, post._id as string))}
                          className="space-y-6"
                        >
                          <FormField
                            name="title"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <Input
                                  placeholder={post.title}
                                  {...field}
                                />
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
                                <Input
                                  placeholder={post.content}
                                  {...field}
                                />
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
                          <Button className="w-full" type="submit" onClick={() => setIsOpen(false)}>
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
