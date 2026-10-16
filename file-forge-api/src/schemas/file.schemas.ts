import { z } from 'zod';
import { FILE_EXTENSIONS } from '../models';

export const fileNameSchema = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(105, 'El nombre es demasiado largo')
  .regex(/^[^/\\]+$/, 'El nombre no puede contener / ni \\');

const folderIdSchema = z
  .string()
  .optional()
  .transform(value => (!value || value === 'root' ? null : value));

export const uploadFileSchema = z.object({
  folderId: folderIdSchema
});

export const listFilesQuerySchema = z.object({
  folderId: z.string().optional(),
  search: z.string().trim().optional(),
  extension: z.enum(FILE_EXTENSIONS).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['name', 'size', 'createdAt', 'updatedAt']).default('name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

export const updateContentSchema = z.object({
  content: z.string()
});

export const updateFileSchema = z
  .object({
    name: fileNameSchema.optional(),
    newFolderId: z.string().nullable().optional()
  })
  .refine(
    data => data.name !== undefined || data.newFolderId !== undefined,
    'No hay datos para actualizar'
  );

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type ListFilesInput = z.infer<typeof listFilesQuerySchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
