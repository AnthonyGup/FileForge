import { z } from 'zod';
import { ACTIVITY_ACTIONS } from '../models';

export const listActivityQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.enum([...ACTIVITY_ACTIONS]).optional(),
  resourceId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional()
});

export type ListActivityInput = z.infer<typeof listActivityQuerySchema>;
