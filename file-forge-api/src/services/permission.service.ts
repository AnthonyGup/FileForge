import { Types } from 'mongoose';
import {
  File,
  FileDoc,
  Folder,
  FolderDoc,
  PermissionLevel,
  ResourceType,
  Share,
  UserDoc
} from '../models';
import { HttpError } from '../utils/http-error';
import { isObjectId } from '../utils/object-id';

export type Permission = 'owner' | PermissionLevel;

const RANK: Record<PermissionLevel, number> = { read: 1, comment: 2, edit: 3 };

export function allows(permission: Permission | null, min: PermissionLevel): boolean {
  if (permission === 'owner') return true;
  return permission !== null && RANK[permission] >= RANK[min];
}

async function sharedPermission(
  userId: Types.ObjectId,
  type: ResourceType,
  resourceId: Types.ObjectId,
  folderIds: Types.ObjectId[]
): Promise<PermissionLevel | null> {
  const shares = await Share.find({
    sharedWithId: userId,
    $or: [
      { resourceType: type, resourceId },
      { resourceType: 'folder', resourceId: { $in: folderIds } }
    ]
  }).select('permission');

  if (shares.length === 0) return null;
  return shares.map(s => s.permission).reduce((a, b) => (RANK[a] >= RANK[b] ? a : b));
}

export async function permissionOnFolder(
  folder: FolderDoc,
  userId: Types.ObjectId
): Promise<Permission | null> {
  if (folder.ownerId.equals(userId)) return 'owner';
  return sharedPermission(userId, 'folder', folder._id, folder.ancestors);
}

export async function permissionOnFile(
  file: FileDoc,
  userId: Types.ObjectId
): Promise<Permission | null> {
  if (file.ownerId.equals(userId)) return 'owner';

  let folderIds: Types.ObjectId[] = [];
  if (file.folderId) {
    const parent = await Folder.findById(file.folderId).select('ancestors');
    folderIds = [file.folderId, ...(parent?.ancestors ?? [])];
  }
  return sharedPermission(userId, 'file', file._id, folderIds);
}

interface LoadOptions {
  includeDeleted?: boolean;
}

async function loadFile(id: string, options: LoadOptions): Promise<FileDoc> {
  const file = isObjectId(id) ? await File.findById(id) : null;
  if (!file || (file.deleted && !options.includeDeleted)) {
    throw HttpError.notFound('El recurso no existe');
  }
  return file;
}

async function loadFolder(id: string, options: LoadOptions): Promise<FolderDoc> {
  const folder = isObjectId(id) ? await Folder.findById(id) : null;
  if (!folder || (folder.deleted && !options.includeDeleted)) {
    throw HttpError.notFound('El recurso no existe');
  }
  return folder;
}

export async function assertFileAccess(
  fileId: string,
  min: PermissionLevel,
  user: UserDoc,
  options: LoadOptions = {}
): Promise<FileDoc> {
  const file = await loadFile(fileId, options);
  const permission = await permissionOnFile(file, user._id);
  if (permission === null) {
    throw HttpError.forbidden('No tienes acceso a este recurso');
  }
  if (!allows(permission, min)) {
    throw HttpError.forbidden();
  }
  return file;
}

export async function assertFolderAccess(
  folderId: string,
  min: PermissionLevel,
  user: UserDoc,
  options: LoadOptions = {}
): Promise<FolderDoc> {
  const folder = await loadFolder(folderId, options);
  const permission = await permissionOnFolder(folder, user._id);
  if (permission === null) {
    throw HttpError.forbidden('No tienes acceso a este recurso');
  }
  if (!allows(permission, min)) {
    throw HttpError.forbidden();
  }
  return folder;
}

export async function assertFileOwner(
  fileId: string,
  user: UserDoc,
  options: LoadOptions = {}
): Promise<FileDoc> {
  const file = await loadFile(fileId, options);
  if (!file.ownerId.equals(user._id)) {
    throw HttpError.forbidden('Solo el propietario puede realizar esta operación');
  }
  return file;
}

export async function assertFolderOwner(
  folderId: string,
  user: UserDoc,
  options: LoadOptions = {}
): Promise<FolderDoc> {
  const folder = await loadFolder(folderId, options);
  if (!folder.ownerId.equals(user._id)) {
    throw HttpError.forbidden('Solo el propietario puede realizar esta operación');
  }
  return folder;
}