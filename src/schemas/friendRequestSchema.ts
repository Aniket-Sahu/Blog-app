import { z } from "zod";

export const friendRequestSchema = z.object({
  receiverId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid user ID"),
  requestId: z.string().regex(/^[a-fA-F0-9]{24}$/), 
  status: z.enum(["accepted", "pending","rejected"]),
});
