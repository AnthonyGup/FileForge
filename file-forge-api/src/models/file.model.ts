import { HydratedDocument, Schema, Types, model } from 'mongoose';
import { FILE_EXTENSIONS, FileExtension } from './constants';
import { jsonOptions } from './json';

export interface IFile {
  name: string;
  extension: FileExtension;
  mimeType: string;
  size: number;
  ownerId: Types.ObjectId;
  folderId: Types.ObjectId | null;
  contentId: Types.ObjectId;
  deleted: boolean;
  deletedAt: Date | null;
  deletedRootId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    name: { type: String, required: true, trim: true, maxlength: 105 },
    extension: { type: String, enum: [...FILE_EXTENSIONS], required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    contentId: { type: Schema.Types.ObjectId, required: true },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedRootId: { type: Schema.Types.ObjectId, default: null }
  },
  { collection: 'files', timestamps: true, toJSON: jsonOptions() }
);

fileSchema.index({ ownerId: 1, folderId: 1, deleted: 1 });
fileSchema.index({ ownerId: 1, deleted: 1, deletedAt: -1 });
fileSchema.index({ ownerId: 1, name: 1 });
fileSchema.index({ extension: 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index(
  { ownerId: 1, folderId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deleted: false } }
);

export const File = model<IFile>('File', fileSchema);
export type FileDoc = HydratedDocument<IFile>;
