"use client";

import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FriendRequest } from "@/schemas/friendRequestSchema";
import { ApiResponse } from "@/types/ApiResponse";
import axios, { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const page = () => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    if (!session || !session.user) return;
    const fetchFriendRequests = async () => {
      try {
        const response = await axios.get(`/api/friend-requests`);
        const filteredFriendRequests = response.data.friendReqs.filter(
          (friendReq: FriendRequest) => friendReq.senderId !== session.user._id
        );
        setFriendRequests(filteredFriendRequests);
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse>;
        toast({
          title: "error",
          description:
            axiosError.response?.data.message ||
            "An error occurred fetching friends",
          variant: "destructive",
        });
      }
    };
    fetchFriendRequests();
  }, [session, toast]);

  const acceptFriendRequest = async (friendId: string) => {
    try {
      await axios.post(`/api/friend-requests/${friendId}`);
      const updatedFriendRequests = friendRequests.filter((friendReq) => {
        const senderId =
          typeof friendReq.senderId === "object" ? friendReq.senderId._id : friendReq.senderId;
        return senderId !== friendId;
      });
      setFriendRequests(updatedFriendRequests);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "error",
        description:
          axiosError.response?.data.message ||
          "An error occurred accepting friend request",
        variant: "destructive",
      });
    }
  }

  const rejectFriendRequest = async (friendId: string) => {
    try {
      await axios.delete(`/api/friend-requests/${friendId}`);
      const updatedFriendRequests = friendRequests.filter((friendReq) => {
        const senderId =
          typeof friendReq.senderId === "object" ? friendReq.senderId._id : friendReq.senderId;
        return senderId !== friendId;
      });
      setFriendRequests(updatedFriendRequests);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "error",
        description:
          axiosError.response?.data.message ||
          "An error occurred rejecting friend request",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-slate-900">Friend Requests</h2>
      <Separator className="my-4" />

      {friendRequests.length === 0 ? (
        <div className="text-slate-600">
          You have no friend requests yet. No one wants to be your friend!
        </div>
      ) : (
        <div className="space-y-4">
          {friendRequests.map((friendReq) => (
            <div
              key={friendReq._id}
              className="flex justify-between items-center bg-white shadow-md p-4 rounded-lg"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {typeof friendReq.senderId === "object" &&
                  "username" in friendReq.senderId
                    ? friendReq.senderId.username
                    : "Unknown Sender"}
                </h2>
                <p className="text-slate-600">wants to be your friend</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {acceptFriendRequest(typeof friendReq.senderId === "object" ? friendReq.senderId._id : friendReq.senderId)}}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Accept
                </button>
                <button
                  onClick={() => {rejectFriendRequest(typeof friendReq.senderId === "object" ? friendReq.senderId._id : friendReq.senderId)}}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default page;
