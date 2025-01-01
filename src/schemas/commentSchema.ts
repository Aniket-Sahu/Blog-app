import { z } from "zod";

export const commentSchema = z.object({
    _id: z.string().regex(/^[a-fA-F0-9]{24}$/), 
    postId: z.string().regex(/^[a-fA-F0-9]{24}$/), 
    content: z.string().min(1).max(300), 
});