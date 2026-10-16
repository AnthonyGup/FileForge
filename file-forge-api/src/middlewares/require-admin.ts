import { RequestHandler } from 'express';
import { HttpError } from '../utils/http-error';
import { currentUser } from './authenticate';

/** Exige rol administrador (usar después de `authenticate`). */
export const requireAdmin: RequestHandler = (req, _res, next) => {
    if (currentUser(req).role !== 'admin') {
        throw HttpError.forbidden('Solo el administrador puede realizar esta operación');
    }
    next();
};