import { HydratedDocument, Schema, Types, model } from 'mongoose';
import { IUserRef, userRefSchema } from './common.schemas';
import { jsonOptions } from './json';

export interface IComment {
  fileId: Types.ObjectId;
  author: IUserRef;
  text: string;
  createdAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true },
    author: { type: userRefSchema, required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 }
  },
  {
    collection: 'comments',
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: jsonOptions()
  }
);

commentSchema.index({ fileId: 1, createdAt: 1 });

export const Comment = model<IComment>('Comment', commentSchema);
export type CommentDoc = HydratedDocument<IComment>;
