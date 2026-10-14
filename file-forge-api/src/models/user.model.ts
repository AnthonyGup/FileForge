import { HydratedDocument, Schema, model } from 'mongoose';
import { USER_ROLES, UserRole } from './constants';
import { jsonOptions} from './json';

export interface IUser {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    active: boolean;
    storageUsed: number;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        name: {type: String, required: true, trim: true, maxlength: 100 },
        email: { type : String, required: true, trim: true, lowercase: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: [...USER_ROLES], default: 'user', required: true },
        active: { type: Boolean, default: true },
        storageUsed: { type: Number, default: 0, min: 0 },
        lastLoginAt: { type: Date, default: null }
    },
    {
        collection: 'users',
        timestamps: true, // createdAt y updatedAt automaticos
        toJSON: jsonOptions(['passwordHash'])
    }
);
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, active: 1 });

export const User = model<IUser>('User', userSchema);
export type UserDoc = HydratedDocument<IUser>;