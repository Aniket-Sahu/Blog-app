import { z } from "zod";

export const profileSchema = z.object({
    _id: z.string().length(24).optional(),
    username: z.string().min(3).max(30),
    bio: z.string().max(150).optional(),  
    privacy: z.enum(['public', 'private']),  
});
  
export type Profile = z.infer<typeof profileSchema>;