import { create } from "domain";
import { z } from "zod";

export const commentSchema = z.object({
    _id: z.string().regex(/^[a-fA-F0-9]{24}$/), 
    username: z.string().min(1).max(30).optional(),
    postId: z.string().regex(/^[a-fA-F0-9]{24}$/), 
    content: z.string().min(1).max(300), 
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type Comment = z.infer<typeof commentSchema>;