import { z } from "zod";

export const postSchema = z.object({
    _id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid post ID").optional(),
    title: z
        .string()
        .min(2, { message: "Title must be at least 2 characters long" })
        .max(20, { message: "Title must not be more than 20 characters long" }),
    content: z
        .string()
        .min(1, { message: "Write more than one character" })
        .max(2500, { message: "Oops! Wrong place to write a novel my friend" }),
    isPublic: z.enum(['public', 'private']),  
    privacy: z.enum(['public', 'private']).optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    likes: z.array(z.string()).optional(),
});


export type Post = z.infer<typeof postSchema>;
