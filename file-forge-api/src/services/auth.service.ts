import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserDoc } from '../models';
import { RegisterInput, UpdateProfileInput } from '../schemas/auth.schemas';
import { HttpError } from '../utils/http-error';
import { isDuplicateKey } from '../utils/mongo-errors';
import { logActivity } from './activity.service';

/**
 * Se compara contra un hash falso cuando el correo no existe para que la respuesta
 * tarde lo mismo y no se pueda deducir que correos están registrados
 */
const DUMMY_HASH = bcrypt.hashSync('contraseña-inexistente', 10);

export function signToken(user: UserDoc): string {
    return jwt.sign({}, env.JWT_SECRET, {
        subject: user.id,
        algorithm: 'HS256',
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn']
    });
}

/**
 * Devuelve id del usuario contenido en el token o lanza un 401
 * @param token El token
 */
export function verifyToken(token: string): string {
    try {
        const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
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

export async function updateProfile(user: UserDoc, data: UpdateProfileInput): Promise<UserDoc> {
    if (data.newPassword) {
        const passwordOk = await bcrypt.compare(data.currentPassword ?? '', user.passwordHash);
        if (!passwordOk) {
            throw HttpError.badRequest('La contraseña actual no es correcta');
        }
        user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;

    try {
        await user.save();
    } catch (err) {
        if (isDuplicateKey(err)) {
            throw HttpError.conflict('El email ya está registrado');
        }
        throw err;
    }

    return user;
}

export async function register(data: RegisterInput): Promise<{ token: string; user: UserDoc }> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    let user: UserDoc;
    try {
        user = await User.create({
            name: data.name,
            email: data.email,
            role: 'user',
            passwordHash
        });
    } catch (err) {
        if (isDuplicateKey(err)) {
            throw HttpError.conflict('El email ya está registrado');
        }
        throw err;
    }

    user.lastLoginAt = new Date();
    await user.save({ timestamps: false });

    await logActivity({ user, action: 'login' });

    return { token: signToken(user), user };
}