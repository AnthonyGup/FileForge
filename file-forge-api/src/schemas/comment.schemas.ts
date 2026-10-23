import { z } from 'zod';

export const createCommentSchema = z.object({
  text: z.string()
});

export const updateCommentSchema = z.object({
  text: z.string()
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
