import { QueryFilter, Types } from 'mongoose';
import {
  Activity,
  ActivityAction,
  ActivityDoc,
  FileDoc,
  FolderDoc,
  IActivity,
  ResourceType,
  UserDoc
} from '../models';
import { ListActivityInput } from '../schemas/activity.schemas';
import { HttpError } from '../utils/http-error';
import { createdAtRange } from '../utils/date-range';

export interface ResourceInput {
  type: ResourceType;
  id: Types.ObjectId;
  name: string;
  ownerId: Types.ObjectId;
}

export function fileRef(file: Pick<FileDoc, '_id' | 'name' | 'ownerId'>): ResourceInput {
  return { type: 'file', id: file._id, name: file.name, ownerId: file.ownerId };
}

export function folderRef(folder: Pick<FolderDoc, '_id' | 'name' | 'ownerId'>): ResourceInput {
  return { type: 'folder', id: folder._id, name: folder.name, ownerId: folder.ownerId };
}

interface LogParams {
  user: Pick<UserDoc, '_id' | 'name'>;
  action: ActivityAction;
  resource?: ResourceInput | null;
  details?: Record<string, unknown>;
}

export interface ActivityPage {
  items: ActivityDoc[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listActivity(input: ListActivityInput, user: UserDoc): Promise<ActivityPage> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 20;

  const filter: QueryFilter<IActivity> = {};
  if (user.role !== 'admin') {
    filter.$or = [{ 'user._id': user._id }, { 'resource.ownerId': user._id }];
  }
  if (input.action) filter.action = input.action;
  if (input.resourceId) filter['resource._id'] = input.resourceId;
  if (input.userId) {
    if (user.role !== 'admin' && input.userId !== user.id) {
      throw HttpError.forbidden('No puedes consultar la información de otro usuario');
    }
    filter['user._id'] = input.userId;
  }
  const range = createdAtRange(input.dateFrom, input.dateTo);
  if (Object.keys(range).length) filter.createdAt = range.createdAt as Record<string, Date>;

  const [items, total] = await Promise.all([
    Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Activity.countDocuments(filter)
  ]);

  return { items, total, page, pageSize };
}

export async function logActivity({ user, action, resource = null, details }: LogParams): Promise<void> {
  try {
    await Activity.create({
      user: { _id: user._id, name: user.name },
      action,
      resource: resource
        ? { type: resource.type, _id: resource.id, name: resource.name, ownerId: resource.ownerId }
        : null,
      details
    });
  } catch (err) {
    console.error('No se pudo registrar la actividad:', err instanceof Error ? err.message : err);
  }
}