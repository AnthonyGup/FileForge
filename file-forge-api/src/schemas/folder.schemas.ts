import { z } from 'zod';

export const folderNameSchema = z
    .string()
    .trim()
    .min(1, 'el nombre es obligatorio')
    .max(100, 'el nombre es demasiado largo')
    .regex(/^[^/\\]+$/, 'El nombre no puede contener / ni \\');

export const listFoldersQuerySchema = z.object({
    parentId: z.string().optional()
});

export const createFolderSchema = z.object({
    name: folderNameSchema,
    parentId: z.string().nullable().optional()      // null o ausente = raíz
});

export const updateFolderSchema = z
    .object({
        name: folderNameSchema.optional(),
        newParentId: z.string().nullable().optional()      // null = mover a la raíz
    })
    .refine(
        data => data.name !== undefined || data.newParentId !== undefined,
        'No hay datos para actualizar'
    );

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;