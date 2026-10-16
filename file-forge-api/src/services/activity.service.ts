import { Types } from 'mongoose';
import { Activity, ActivityAction, FileDoc, FolderDoc, ResourceType, UserDoc } from '../models';

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