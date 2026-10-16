import { Request, RequestHandler } from 'express';
import { User, UserDoc } from '../models';
import { verifyToken } from '../services/auth.service';
import { HttpError } from '../utils/http-error';

export const authenticate: RequestHandler = async (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme != 'Bearer' || !token) {
        throw HttpError.unauthorized();
    }

    const userId = verifyToken(token);
    const user = await User.findById(userId);
    if (!user || !user.active) {
        throw HttpError.unauthorized('Tu sesion ya no es valida');
    }

    req.user = user;
    next();
};

/**
 * Usuario autenticado de la peticion (solo despues de 'authenticate')
 * @param req
 */
export function currentUser(req: Request): UserDoc {
    if (!req.user) {
        throw HttpError.unauthorized();
    }
    return req.user;
}