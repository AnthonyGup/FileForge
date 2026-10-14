import { HydratedDocument, Schema, model } from 'mongoose';
import { ACTIVITY_ACTIONS, ActivityAction } from './constants';
import { IResourceRef, IUserRef, resourceRefSchema, userRefSchema } from './common.schemas';
import { jsonOptions } from './json';

export interface IActivity {
  user: IUserRef;
  action: ActivityAction;
  resource: IResourceRef | null;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    user: { type: userRefSchema, required: true },
    action: { type: String, enum: [...ACTIVITY_ACTIONS], required: true },
    resource: { type: resourceRefSchema, default: null },
    details: { type: Schema.Types.Mixed }
  },
  {
    collection: 'activity',
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: jsonOptions()
  }
);

activitySchema.index({ 'user._id': 1, createdAt: -1 });
activitySchema.index({ 'resource._id': 1, createdAt: -1 });
activitySchema.index({ 'resource.ownerId': 1, createdAt: -1 });
activitySchema.index({ action: 1 });
activitySchema.index({ createdAt: -1 });

export const Activity = model<IActivity>('Activity', activitySchema);
export type ActivityDoc = HydratedDocument<IActivity>;
