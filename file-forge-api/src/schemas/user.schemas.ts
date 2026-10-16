import { z } from 'zod';
import { USER_ROLES } from '../models';

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre es demasiado largo'),
  email: z.string().trim().toLowerCase().email('El correo no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(USER_ROLES)
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre es demasiado largo').optional(),
    role: z.enum(USER_ROLES).optional(),
    active: z.boolean().optional()
  })
  .refine(data => Object.keys(data).length > 0, 'No hay datos para actualizar');

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;