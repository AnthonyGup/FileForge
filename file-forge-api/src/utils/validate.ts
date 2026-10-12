import { z } from 'zod';
import { HttpError } from './http-error';

/** Valida `data` con el schema y devuelve el resultado tipado; si falla lanza un 400. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map(issue => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
      .join('. ');
    throw HttpError.badRequest(message);
  }
  return result.data;
}
