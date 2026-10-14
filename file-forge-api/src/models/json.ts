import { SchemaOptions } from 'mongoose';

export function jsonOptions(hidden: string[] = []): SchemaOptions['toJSON'] {
    return {
        versionKey: false,
        transform: (_doc, ret: Record<string, unknown>) => {
            if (ret._id !== undefined) {
                ret.id = String(ret._id);
                delete ret._id;
            }
            for (const key of hidden) {
                delete ret[key];
            }
            return ret;
        }
    };
}