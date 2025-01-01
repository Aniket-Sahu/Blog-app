"use client"

import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "@/schemas/profileSchema";
import { ApiResponse } from "@/types/ApiResponse";
import axios, { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const page = () => {

    const {data: session} = useSession();
    const router = useRouter();
    const {toast} = useToast();
    const [friends, setFriends] = useState<Profile[]>([]);

    useEffect(() => {
        if (!session || !session.user) return;
        const fetchFriends = async () => {
            try {
                const response = await axios.get(`/api/friends`);
                const filteredFriends = response.data.friends.filter(
                  (friend: Profile) => friend._id !== session.user._id 
                );
                setFriends(filteredFriends);
            } catch (error) {
                const axiosError = error as AxiosError<ApiResponse>;
                toast({
                    title: "error",
                    description: axiosError.response?.data.message || "An error occurred fetching friends",
                    variant: "destructive"
                });
            }
        }
        fetchFriends();
    }, [session, toast]);

    return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-900">Friends</h2>
          <Separator className="my-4" />
    
          {friends.length === 0 ? (
            <div className="text-slate-600">You have no friends yet. You are so lonely!</div>
          ) : (
            <div className="space-y-4">
              {friends.map((friend) => (
                <div
                  key={friend._id}
                  className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm cursor-pointer hover:shadow-md"
                  onClick={() => router.push(`/u/${friend._id}`)}
                >
                  <h3 className="text-lg font-bold text-slate-800">{friend.username}</h3>
                  <p className="text-slate-600 line-clamp-2">
                    {friend.bio && friend.bio.length > 100 ? (
                      <>
                        {friend.bio.slice(0, 100)}...
                        <span className="text-blue-500 font-medium"> Read more</span>
                      </>
                    ) : (
                      friend.bio || "No bio available"
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
    );
}

export default page;