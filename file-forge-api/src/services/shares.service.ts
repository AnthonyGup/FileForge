import { PipelineStage } from 'mongoose';
import {
  File,
  Folder,
  PermissionLevel,
  ResourceType,
  Share,
  ShareDoc,
  User,
  UserDoc
} from '../models';
import { CreateShareInput, ListSharesInput, UpdateShareInput } from '../schemas/share.schemas';
import { HttpError } from '../utils/http-error';
import { isObjectId } from '../utils/object-id';
import { fileRef, folderRef, logActivity, ResourceInput } from './activity.service';
import { assertFileOwner, assertFolderOwner } from './permission.service';

export interface ShareView {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  ownerId: string;
  sharedWithId: string;
  permission: PermissionLevel;
  createdAt: Date;
  updatedAt: Date;
  resourceName: string;
  ownerName: string;
  sharedWithName: string;
}

async function ownedResource(
  type: ResourceType,
  id: string,
  user: UserDoc
): Promise<{ name: string; ref: ResourceInput }> {
  if (type === 'file') {
    const file = await assertFileOwner(id, user);
    return { name: file.name, ref: fileRef(file) };
  }
  const folder = await assertFolderOwner(id, user);
  return { name: folder.name, ref: folderRef(folder) };
}

async function resourceRefOf(share: ShareDoc): Promise<ResourceInput | null> {
  if (share.resourceType === 'file') {
    const file = await File.findById(share.resourceId);
    return file ? fileRef(file) : null;
  }
  const folder = await Folder.findById(share.resourceId);
  return folder ? folderRef(folder) : null;
}

async function loadShare(id: string): Promise<ShareDoc> {
  const share = isObjectId(id) ? await Share.findById(id) : null;
  if (!share) {
    throw HttpError.notFound('Permiso no encontrado');
  }
  return share;
}

export async function createShare(input: CreateShareInput, user: UserDoc): Promise<ShareDoc> {
  const resource = await ownedResource(input.resourceType, input.resourceId, user);

  if (input.sharedWithId === user.id) {
    throw HttpError.badRequest('No puedes compartir un recurso contigo mismo');
  }

  const target = isObjectId(input.sharedWithId)
    ? await User.findOne({ _id: input.sharedWithId, active: true })
    : null;
  if (!target) {
    throw HttpError.notFound('El usuario destino no es válido');
  }

  const existing = await Share.findOne({
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    sharedWithId: input.sharedWithId
  });

  if (existing) {
    existing.permission = input.permission;
    await existing.save();
    await logActivity({
      user,
      action: 'update_share',
      resource: resource.ref,
      details: { sharedWith: target.name, permission: input.permission }
    });
    return existing;
  }

  const share = await Share.create({
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ownerId: user._id,
    sharedWithId: input.sharedWithId,
    permission: input.permission
  });
  await logActivity({
    user,
    action: 'share',
    resource: resource.ref,
    details: { sharedWith: target.name, permission: input.permission }
  });
  return share;
}

export async function updateShare(
  id: string,
  input: UpdateShareInput,
  user: UserDoc
): Promise<ShareDoc> {
  const share = await loadShare(id);
  if (!share.ownerId.equals(user._id)) {
    throw HttpError.forbidden('Solo el propietario puede modificar el permiso');
  }

  share.permission = input.permission;
  await share.save();

  const target = await User.findById(share.sharedWithId).select('name');
  await logActivity({
    user,
    action: 'update_share',
    resource: await resourceRefOf(share),
    details: { sharedWith: target?.name, permission: input.permission }
  });
  return share;
}

export async function revokeShare(id: string, user: UserDoc): Promise<void> {
  const share = await loadShare(id);
  if (!share.ownerId.equals(user._id)) {
    throw HttpError.forbidden('Solo el propietario puede retirar el permiso');
  }

  const target = await User.findById(share.sharedWithId).select('name');
  const ref = await resourceRefOf(share);
  await share.deleteOne();
  await logActivity({
    user,
    action: 'revoke_share',
    resource: ref,
    details: { sharedWith: target?.name }
  });
}

export async function listSharesByResource(
  input: ListSharesInput,
  user: UserDoc
): Promise<ShareView[]> {
  const resource = await ownedResource(input.resourceType, input.resourceId, user);

  const shares = await Share.find({
    resourceType: input.resourceType,
    resourceId: input.resourceId
  }).sort({ createdAt: 1 });

  const targetIds = [...new Set(shares.map(s => s.sharedWithId.toString()))];
  const targets = await User.find({ _id: { $in: targetIds } }).select('name');
  const nameById = new Map(targets.map(u => [u.id, u.name]));

  return shares.map(share => ({
    id: share.id,
    resourceType: share.resourceType,
    resourceId: share.resourceId.toString(),
    ownerId: share.ownerId.toString(),
    sharedWithId: share.sharedWithId.toString(),
    permission: share.permission,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
    resourceName: resource.name,
    ownerName: user.name,
    sharedWithName: nameById.get(share.sharedWithId.toString()) ?? '(eliminado)'
  }));
}

async function shareViews(
  match: Record<string, unknown>,
  onlyLiveResources: boolean
): Promise<ShareView[]> {
  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $lookup: { from: 'folders', localField: 'resourceId', foreignField: '_id', as: 'folder' }
    },
    {
      $lookup: { from: 'files', localField: 'resourceId', foreignField: '_id', as: 'file' }
    },
    {
      $addFields: {
        resource: {
          $cond: [
            { $eq: ['$resourceType', 'folder'] },
            { $arrayElemAt: ['$folder', 0] },
            { $arrayElemAt: ['$file', 0] }
          ]
        }
      }
    }
  ];

  if (onlyLiveResources) {
    pipeline.push({ $match: { 'resource.deleted': { $ne: true } } });
  }

  pipeline.push(
    { $lookup: { from: 'users', localField: 'ownerId', foreignField: '_id', as: 'owner' } },
    { $lookup: { from: 'users', localField: 'sharedWithId', foreignField: '_id', as: 'sharedWith' } }
  );

  const rows = await Share.aggregate(pipeline);

  return rows.map(row => ({
    id: String(row._id),
    resourceType: row.resourceType,
    resourceId: String(row.resourceId),
    ownerId: String(row.ownerId),
    sharedWithId: String(row.sharedWithId),
    permission: row.permission,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resourceName: row.resource?.name ?? '(eliminado)',
    ownerName: row.owner?.[0]?.name ?? '(eliminado)',
    sharedWithName: row.sharedWith?.[0]?.name ?? '(eliminado)'
  }));
}

export function sharedByMe(user: UserDoc): Promise<ShareView[]> {
  return shareViews({ ownerId: user._id }, true);
}

export function sharedWithMe(user: UserDoc): Promise<ShareView[]> {
  return shareViews({ sharedWithId: user._id }, true);
}
