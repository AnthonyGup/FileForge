import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().trim().min(1, 'El correo es obligatorio'),
    password: z.string().min(1, 'La contraseña es obligatoria')
});

export const registerSchema = z.object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre es demasiado largo'),
    email: z.string().trim().toLowerCase().email('El correo no es válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const updateProfileSchema = z
    .object({
        name: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre es demasiado largo').optional(),
        email: z.string().trim().toLowerCase().email('El correo no es válido').optional(),
        currentPassword: z.string().min(1, 'La contraseña actual es obligatoria').optional(),
        newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres').optional()
    })
    .refine(data => Object.keys(data).length > 0, 'No hay datos para actualizar')
    .refine(data => !data.newPassword || Boolean(data.currentPassword), 'Debes ingresar tu contraseña actual');

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;