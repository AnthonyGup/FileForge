import bcrypt from 'bcryptjs';
import { User, UserDoc } from '../models';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schemas';
import { HttpError } from '../utils/http-error';
import { isDuplicateKey } from '../utils/mongo-errors';
import { isObjectId } from '../utils/object-id';

export function listUsers(): Promise<UserDoc[]> {
  return User.find().sort({ createdAt: 1 });
}

export function listForSharing(me: UserDoc): Promise<UserDoc[]> {
  return User.find({ active: true, _id: { $ne: me._id } }).sort({ name: 1 });
}

export async function createUser(data: CreateUserInput): Promise<UserDoc> {
  const passwordHash = await bcrypt.hash(data.password, 10);
  try {
    return await User.create({
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw HttpError.conflict('El email ya está registrado');
    }
    throw err;
  }
}

export async function updateUser(id: string, data: UpdateUserInput, actor: UserDoc): Promise<UserDoc> {
  const user = isObjectId(id) ? await User.findById(id) : null;
  if (!user) {
    throw HttpError.notFound('Usuario no encontrado');
  }

  if (user.id === actor.id) {
    if (data.active === false) {
      throw HttpError.badRequest('No puedes desactivarte a ti mismo');
    }
    if (data.role !== undefined && data.role !== user.role) {
      throw HttpError.badRequest('No puedes cambiar tu propio rol');
    }
  }

  if (data.name !== undefined) user.name = data.name;
  if (data.role !== undefined) user.role = data.role;
  if (data.active !== undefined) user.active = data.active;

  await user.save();
  return user;
}