import { z } from 'zod';

export const createCommentSchema = z.object({
  text: z.string()
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
