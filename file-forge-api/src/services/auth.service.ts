import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserDoc } from '../models';
import { HttpError } from '../utils/http-error';
import { logActivity } from './activity.service';

/**
 * Se compara contra un hash falso cuando el correo no existe para que la respuesta
 * tarde lo mismo y no se pueda deducir que correos están registrados
 */
const DUMMY_HASH = bcrypt.hashSync('contraseña-inexistente', 10);

export function signToken(user: UserDoc): string {
    return jwt.sign({}, env.JWT_SECRET, {
        subject: user.id,
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn']
    });
}

/**
 * Devuelve id del usuario contenido en el token o lanza un 401
 * @param token El token
 */
export function verifyToken(token: string): string {
    try {
        const payload = jwt.verify(token, env.JWT_SECRET);
        if (typeof payload == 'string' || typeof  payload.sub != 'string') {
            throw new Error('Payload invalido');
        }
        return payload.sub;
    } catch (err) {
        const expired = err instanceof jwt.TokenExpiredError;
        throw HttpError.unauthorized(expired ? 'Tu sesión expiró, Inicia sesión nuevamente' : 'Token no válido');
    }
}

export async function login(email: string, password: string): Promise<{ token: string; user: UserDoc }> {
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk) {
        throw HttpError.unauthorized('Credenciales inválidas');
    }
    if (!user.active) {
        throw HttpError.forbidden('Usuario inactivo');
    }

    user.lastLoginAt = new Date();
    await user.save({ timestamps: false });      // no cambia updatedAt en cada login

    await logActivity({ user, action: 'login' });

    return { token: signToken(user), user };
}