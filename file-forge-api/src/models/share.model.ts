import { HydratedDocument, Schema, Types, model } from 'mongoose';
import { PERMISSIONS, PermissionLevel, RESOURCE_TYPES, ResourceType } from './constants';
import { jsonOptions } from './json';

export interface IShare {
  resourceType: ResourceType;
  resourceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  sharedWithId: Types.ObjectId;
  permission: PermissionLevel;
  createdAt: Date;
  updatedAt: Date;
}

const shareSchema = new Schema<IShare>(
  {
    resourceType: { type: String, enum: [...RESOURCE_TYPES], required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWithId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    permission: { type: String, enum: [...PERMISSIONS], required: true }
  },
  { collection: 'shares', timestamps: true, toJSON: jsonOptions() }
);

shareSchema.index({ resourceType: 1, resourceId: 1, sharedWithId: 1 }, { unique: true });
shareSchema.index({ sharedWithId: 1, resourceType: 1 });
shareSchema.index({ ownerId: 1, createdAt: -1 });

export const Share = model<IShare>('Share', shareSchema);
export type ShareDoc = HydratedDocument<IShare>;
