import { Types } from 'mongoose';
import { HttpError } from './http-error';

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID.test(value);
}

/** Convierte un string en ObjectId o lanza un 400. */
export function toObjectId(value: unknown, label = 'identificador'): Types.ObjectId {
  if (!isObjectId(value)) {
    throw HttpError.badRequest(`El ${label} no es válido`);
  }
  return new Types.ObjectId(value);
}
