import { QueryFilter, Types } from 'mongoose';
import {
  File,
  FileDoc,
  FileExtension,
  Folder,
  FolderDoc,
  IFile,
  Share,
  User,
  UserDoc
} from '../models';
import { ListFilesInput, UpdateFileInput, UploadFileInput } from '../schemas/file.schemas';
import { deleteContent, readContent, uploadContent } from '../utils/gridfs';
import { HttpError } from '../utils/http-error';
import { isDuplicateKey } from '../utils/mongo-errors';
import { fileRef, logActivity } from './activity.service';
import { assertFileAccess, assertFolderAccess } from './permission.service';

const EXTENSION_RE = /\.(txt|md)$/i;
const NAME_COLLATION = { locale: 'es', strength: 2 };
const MIME_BY_EXTENSION: Record<FileExtension, string> = {
  txt: 'text/plain',
  md: 'text/markdown'
};

export interface FilePage {
  items: FileDoc[];
  total: number;
  page: number;
  pageSize: number;
}

function parseFileName(originalName: string): { name: string; extension: FileExtension } {
  const name = originalName.trim();
  const match = EXTENSION_RE.exec(name);
  if (!match) {
    throw HttpError.badRequest('Solo se permiten archivos .txt y .md');
  }
  return { name, extension: match[1].toLowerCase() as FileExtension };
}

export async function assertFileNameAvailable(
  ownerId: Types.ObjectId,
  folderId: Types.ObjectId | null,
  name: string,
  message = 'Ya existe un archivo con ese nombre en la carpeta',
  excludeId?: Types.ObjectId
): Promise<void> {
  const exists = await File.exists({
    ownerId,
    folderId,
    name,
    deleted: false,
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  });
  if (exists) {
    throw HttpError.conflict(message);
  }
}

async function resolveDestination(
  folderId: string | null,
  user: UserDoc
): Promise<{ ownerId: Types.ObjectId; folderId: Types.ObjectId | null }> {
  if (!folderId) {
    return { ownerId: user._id, folderId: null };
  }
  const folder: FolderDoc = await assertFolderAccess(folderId, 'edit', user);
  return { ownerId: folder.ownerId, folderId: folder._id };
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  data: UploadFileInput,
  user: UserDoc
): Promise<FileDoc> {
  const { name, extension } = parseFileName(originalName);
  const destination = await resolveDestination(data.folderId, user);

  await assertFileNameAvailable(destination.ownerId, destination.folderId, name);

  const contentId = await uploadContent(buffer, name, { ownerId: destination.ownerId, name });

  let file: FileDoc;
  try {
    file = await File.create({
      name,
      extension,
      mimeType: MIME_BY_EXTENSION[extension],
      size: buffer.length,
      ownerId: destination.ownerId,
      folderId: destination.folderId,
      contentId
    });
  } catch (err) {
    await deleteContent(contentId);
    if (isDuplicateKey(err)) {
      throw HttpError.conflict('Ya existe un archivo con ese nombre en la carpeta');
    }
    throw err;
  }

  await User.updateOne({ _id: destination.ownerId }, { $inc: { storageUsed: buffer.length } });
  await logActivity({ user, action: 'upload', resource: fileRef(file) });
  return file;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dayBoundary(value: string, end: boolean): Date {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`
    : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw HttpError.badRequest('La fecha no es válida');
  }
  return date;
}

async function accessibleFolderIds(userId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const shares = await Share.find({ sharedWithId: userId, resourceType: 'folder' }).select('resourceId');
  const sharedIds = shares.map(s => s.resourceId);
  if (sharedIds.length === 0) return [];
  const descendants = await Folder.find({ ancestors: { $in: sharedIds } }).select('_id');
  return [...sharedIds, ...descendants.map(f => f._id)];
}

async function accessibleFileFilter(userId: Types.ObjectId): Promise<QueryFilter<IFile>> {
  const [folderIds, fileShares] = await Promise.all([
    accessibleFolderIds(userId),
    Share.find({ sharedWithId: userId, resourceType: 'file' }).select('resourceId')
  ]);
  const directFileIds = fileShares.map(s => s.resourceId);
  return {
    deleted: false,
    $or: [
      { ownerId: userId },
      ...(folderIds.length ? [{ folderId: { $in: folderIds } }] : []),
      ...(directFileIds.length ? [{ _id: { $in: directFileIds } }] : [])
    ]
  };
}

export async function listFiles(input: ListFilesInput, user: UserDoc): Promise<FilePage> {
  let filter: QueryFilter<IFile>;

  if (input.folderId === undefined) {
    filter = await accessibleFileFilter(user._id);
  } else if (!input.folderId || input.folderId === 'root') {
    filter = { ownerId: user._id, folderId: null, deleted: false };
  } else {
    const folder = await assertFolderAccess(input.folderId, 'read', user);
    filter = { folderId: folder._id, deleted: false };
  }

  if (input.search) {
    filter.name = new RegExp(escapeRegExp(input.search), 'i');
  }
  if (input.extension) {
    filter.extension = input.extension;
  }
  if (input.dateFrom || input.dateTo) {
    filter.createdAt = {
      ...(input.dateFrom ? { $gte: dayBoundary(input.dateFrom, false) } : {}),
      ...(input.dateTo ? { $lte: dayBoundary(input.dateTo, true) } : {})
    };
  }

  const direction = input.sortDir === 'desc' ? -1 : 1;
  const query = File.find(filter).sort({ [input.sortBy]: direction });
  if (input.sortBy === 'name') {
    query.collation(NAME_COLLATION);
  }

  const [items, total] = await Promise.all([
    query.skip((input.page - 1) * input.pageSize).limit(input.pageSize),
    File.countDocuments(filter)
  ]);

  return { items, total, page: input.page, pageSize: input.pageSize };
}

export function getFile(id: string, user: UserDoc): Promise<FileDoc> {
  return assertFileAccess(id, 'read', user);
}

export async function getFileContent(
  id: string,
  user: UserDoc
): Promise<{ fileId: string; content: string }> {
  const file = await assertFileAccess(id, 'read', user);
  const buffer = await readContent(file.contentId);
  return { fileId: file.id, content: buffer.toString('utf8') };
}

export async function updateFileContent(
  id: string,
  content: string,
  user: UserDoc
): Promise<FileDoc> {
  const file = await assertFileAccess(id, 'edit', user);
  const previousContentId = file.contentId;
  const previousSize = file.size;
  const buffer = Buffer.from(content, 'utf8');

  const contentId = await uploadContent(buffer, file.name, { ownerId: file.ownerId, name: file.name });
  file.contentId = contentId;
  file.size = buffer.length;

  try {
    await file.save();
  } catch (err) {
    await deleteContent(contentId);
    throw err;
  }

  await deleteContent(previousContentId);
  await User.updateOne({ _id: file.ownerId }, { $inc: { storageUsed: buffer.length - previousSize } });
  await logActivity({ user, action: 'edit', resource: fileRef(file) });
  return file;
}

export async function downloadFile(id: string, user: UserDoc): Promise<FileDoc> {
  const file = await assertFileAccess(id, 'read', user);
  await logActivity({ user, action: 'download', resource: fileRef(file) });
  return file;
}

function sameId(a: Types.ObjectId | null, b: Types.ObjectId | null): boolean {
  if (a === null || b === null) return a === b;
  return a.equals(b);
}

export async function updateFile(id: string, data: UpdateFileInput, user: UserDoc): Promise<FileDoc> {
  const file = await assertFileAccess(id, 'edit', user);
  const previousName = file.name;
  const previousFolderId = file.folderId;

  const moving = data.newFolderId !== undefined;
  let newFolderId = previousFolderId;
  if (moving) {
    if (data.newFolderId === null) {
      newFolderId = null;
    } else if (data.newFolderId !== undefined) {
      const folder = await assertFolderAccess(data.newFolderId, 'edit', user);
      if (!folder.ownerId.equals(file.ownerId)) {
        throw HttpError.badRequest('Solo se puede mover dentro del mismo propietario');
      }
      newFolderId = folder._id;
    }
  }

  const newName = data.name ?? previousName;
  const nameChanged = newName !== previousName;
  const folderChanged = moving && !sameId(newFolderId, previousFolderId);

  if (!nameChanged && !folderChanged) {
    return file;
  }

  if (nameChanged && !newName.toLowerCase().endsWith('.' + file.extension)) {
    throw HttpError.badRequest(`El archivo debe conservar la extensión .${file.extension}`);
  }

  await assertFileNameAvailable(
    file.ownerId,
    newFolderId,
    newName,
    folderChanged ? 'Ya existe un archivo con ese nombre en el destino' : 'Ya existe un archivo con ese nombre en la carpeta',
    file._id
  );

  file.name = newName;
  if (folderChanged) {
    file.folderId = newFolderId;
  }

  try {
    await file.save();
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw HttpError.conflict('Ya existe un archivo con ese nombre en la carpeta');
    }
    throw err;
  }

  if (nameChanged) {
    await logActivity({ user, action: 'rename', resource: fileRef(file), details: { from: previousName, to: newName } });
  }
  if (folderChanged) {
    await logActivity({ user, action: 'move', resource: fileRef(file), details: { from: previousFolderId, to: newFolderId } });
  }

  return file;
}
