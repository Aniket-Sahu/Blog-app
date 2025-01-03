import { z } from "zod";

const senderSchema = z.object({
  _id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid user ID"),
  username: z.string(), 
});

export const friendRequestSchema = z.object({
  _id: z.string().regex(/^[a-fA-F0-9]{24}$/), 
  receiverId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid user ID"),
  senderId: z.union([z.string().regex(/^[a-fA-F0-9]{24}$/), senderSchema]),
  status: z.enum(["accepted", "pending","rejected"]),
});

export type FriendRequest = z.infer<typeof friendRequestSchema>;