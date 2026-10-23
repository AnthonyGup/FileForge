import { Types } from 'mongoose';
import {
  Comment,
  File,
  FileDoc,
  Folder,
  FolderDoc,
  ResourceType,
  Share,
  User,
  UserDoc
} from '../models';
import { deleteContent } from '../utils/gridfs';
import { HttpError } from '../utils/http-error';
import type { ResourceInput } from './activity.service';
import { fileRef, folderRef, logActivity } from './activity.service';
import { assertFileOwner, assertFolderOwner } from './permission.service';

export interface TrashItem {
  id: string;
  type: ResourceType;
  name: string;
  size?: number;
  deletedAt: Date;
}

interface TrashedDoc {
  _id: Types.ObjectId;
  deleted: boolean;
  deletedRootId: Types.ObjectId | null;
}

function assertInTrash(doc: TrashedDoc): void {
  if (!doc.deleted || !doc.deletedRootId || !doc.deletedRootId.equals(doc._id)) {
    throw HttpError.badRequest('El elemento no está en la papelera');
  }
}

async function fileNameTaken(
  ownerId: Types.ObjectId,
  folderId: Types.ObjectId | null,
  name: string,
  excludeId: Types.ObjectId
): Promise<boolean> {
  return !!(await File.exists({ ownerId, folderId, name, deleted: false, _id: { $ne: excludeId } }));
}

async function folderNameTaken(
  ownerId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  excludeId: Types.ObjectId
): Promise<boolean> {
  return !!(await Folder.exists({ ownerId, parentId, name, deleted: false, _id: { $ne: excludeId } }));
}

export async function listTrash(user: UserDoc): Promise<TrashItem[]> {
  const [folders, files] = await Promise.all([
    Folder.find({ ownerId: user._id, deleted: true, $expr: { $eq: ['$deletedRootId', '$_id'] } }),
    File.find({ ownerId: user._id, deleted: true, $expr: { $eq: ['$deletedRootId', '$_id'] } })
  ]);

  const items: TrashItem[] = [
    ...folders.map((folder): TrashItem => ({
      id: folder.id,
      type: 'folder',
      name: folder.name,
      deletedAt: folder.deletedAt ?? folder.updatedAt
    })),
    ...files.map((file): TrashItem => ({
      id: file.id,
      type: 'file',
      name: file.name,
      size: file.size,
      deletedAt: file.deletedAt ?? file.updatedAt
    }))
  ];

  return items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}

export async function restoreTrash(type: ResourceType, id: string, user: UserDoc): Promise<void> {
  if (type === 'file') {
    const file = await assertFileOwner(id, user, { includeDeleted: true });
    assertInTrash(file);

    const parent = file.folderId ? await Folder.findById(file.folderId) : null;
    const folderId = parent && !parent.deleted ? parent._id : null;

    file.folderId = folderId;
    if (await fileNameTaken(file.ownerId, folderId, file.name, file._id)) {
      file.name = file.name.replace(/(\.[^.]+)$/, ' (restaurado)$1');
    }
    file.deleted = false;
    file.deletedAt = null;
    file.deletedRootId = null;
    await file.save();

    await logActivity({ user, action: 'restore', resource: fileRef(file) });
    return;
  }

  const folder = await assertFolderOwner(id, user, { includeDeleted: true });
  assertInTrash(folder);

  const parent = folder.parentId ? await Folder.findById(folder.parentId) : null;
  const target = parent && !parent.deleted ? parent : null;
  const newAncestors = target ? [...target.ancestors, target._id] : [];

  folder.parentId = target ? target._id : null;
  folder.ancestors = newAncestors;
  if (await folderNameTaken(folder.ownerId, folder.parentId, folder.name, folder._id)) {
    folder.name = `${folder.name} (restaurado)`;
  }
  folder.deleted = false;
  folder.deletedAt = null;
  folder.deletedRootId = null;
  await folder.save();

  const now = new Date();
  await Folder.updateMany(
    { deletedRootId: folder._id, _id: { $ne: folder._id } },
    [
      {
        $set: {
          ancestors: {
            $concatArrays: [
              newAncestors,
              {
                $slice: [
                  '$ancestors',
                  { $indexOfArray: ['$ancestors', folder._id] },
                  { $size: '$ancestors' }
                ]
              }
            ]
          },
          deleted: false,
          deletedAt: null,
          deletedRootId: null,
          updatedAt: now
        }
      }
    ],
    { updatePipeline: true }
  );
  await File.updateMany(
    { deletedRootId: folder._id },
    { $set: { deleted: false, deletedAt: null, deletedRootId: null, updatedAt: now } }
  );

  await logActivity({ user, action: 'restore', resource: folderRef(folder) });
}

export async function deletePermanent(type: ResourceType, id: string, user: UserDoc): Promise<void> {
  let ref: ResourceInput;
  if (type === 'file') {
    const file: FileDoc = await assertFileOwner(id, user, { includeDeleted: true });
    assertInTrash(file);
    ref = fileRef(file);
  } else {
    const folder: FolderDoc = await assertFolderOwner(id, user, { includeDeleted: true });
    assertInTrash(folder);
    ref = folderRef(folder);
  }

  const folders = await Folder.find({ deletedRootId: id });
  const files = await File.find({ deletedRootId: id });

  await logActivity({ user, action: 'delete_permanent', resource: ref });

  for (const file of files) {
    await deleteContent(file.contentId);
  }

  const usedByOwner = new Map<string, number>();
  for (const file of files) {
    const key = file.ownerId.toString();
    usedByOwner.set(key, (usedByOwner.get(key) ?? 0) + file.size);
  }
  for (const [ownerId, size] of usedByOwner) {
    await User.updateOne(
      { _id: ownerId },
      [{ $set: { storageUsed: { $max: [0, { $subtract: ['$storageUsed', size] }] } } }],
      { updatePipeline: true }
    );
  }

  const folderIds = folders.map(f => f._id);
  const fileIds = files.map(f => f._id);
  const resourceIds = [...folderIds, ...fileIds];

  await Promise.all([
    Folder.deleteMany({ _id: { $in: folderIds } }),
    File.deleteMany({ _id: { $in: fileIds } }),
    Share.deleteMany({ resourceId: { $in: resourceIds } }),
    Comment.deleteMany({ fileId: { $in: fileIds } })
  ]);
}
