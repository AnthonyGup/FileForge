import { z } from 'zod';
import { PERMISSIONS, RESOURCE_TYPES } from '../models';

export const createShareSchema = z.object({
  resourceType: z.enum(RESOURCE_TYPES),
  resourceId: z.string(),
  sharedWithId: z.string(),
  permission: z.enum(PERMISSIONS)
});

export const updateShareSchema = z.object({
  permission: z.enum(PERMISSIONS)
});

export const listSharesQuerySchema = z.object({
  resourceType: z.enum(RESOURCE_TYPES),
  resourceId: z.string()
});

export type CreateShareInput = z.infer<typeof createShareSchema>;
export type UpdateShareInput = z.infer<typeof updateShareSchema>;
export type ListSharesInput = z.infer<typeof listSharesQuerySchema>;
