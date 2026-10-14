import { HydratedDocument, Schema, Types, model } from 'mongoose';
import { jsonOptions } from './json';

export interface IFolder {
  name: string;
  ownerId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  ancestors: Types.ObjectId[];
  deleted: boolean;
  deletedAt: Date | null;
  deletedRootId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    ancestors: { type: [Schema.Types.ObjectId], default: [] },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedRootId: { type: Schema.Types.ObjectId, default: null }
  },
  { collection: 'folders', timestamps: true, toJSON: jsonOptions() }
);

folderSchema.index({ ownerId: 1, parentId: 1, deleted: 1 });
folderSchema.index({ ownerId: 1, deleted: 1, deletedAt: -1 });
folderSchema.index(
  { ownerId: 1, parentId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deleted: false } }
);

export const Folder = model<IFolder>('Folder', folderSchema);
export type FolderDoc = HydratedDocument<IFolder>;
