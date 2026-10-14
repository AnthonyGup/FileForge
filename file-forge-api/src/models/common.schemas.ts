import { Schema, Types } from 'mongoose';
import { ResourceType, RESOURCE_TYPES } from './constants';
import { jsonOptions } from './json';

export interface IUserRef {
  _id: Types.ObjectId;
  name: string;
}

export const userRefSchema = new Schema<IUserRef>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true }
  },
  { toJSON: jsonOptions() }
);

export interface IResourceRef {
  type: ResourceType;
  _id: Types.ObjectId;
  name: string;
  ownerId: Types.ObjectId;
}

export const resourceRefSchema = new Schema<IResourceRef>(
  {
    type: { type: String, enum: [...RESOURCE_TYPES], required: true },
    _id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true }
  },
  { toJSON: jsonOptions() }
);
