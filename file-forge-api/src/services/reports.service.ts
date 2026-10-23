import { PipelineStage, Types } from 'mongoose';
import { Activity, File, Share, User, UserDoc } from '../models';
import {
  ActionPercentRow,
  ActivityReportRow,
  DateReportRow,
  FileOperationsRow,
  FileTypeReportRow,
  PeriodReportRow,
  ShareResourceRow,
  SharedFileRow,
  StorageReportRow,
  UserFilesRow,
  UserSharesRow
} from '../models/report.model';
import { PeriodQueryInput, RankingQueryInput, ReportQueryInput } from '../schemas/report.schemas';
import { createdAtRange } from '../utils/date-range';
import { HttpError } from '../utils/http-error';
import { isObjectId } from '../utils/object-id';

const DEFAULT_LIMIT = 10;

function fileScope(user: UserDoc): Record<string, unknown> {
  return user.role === 'admin' ? { deleted: false } : { deleted: false, ownerId: user._id };
}

function activityScope(user: UserDoc): Record<string, unknown> {
  return user.role === 'admin' ? {} : { $or: [{ 'user._id': user._id }, { 'resource.ownerId': user._id }] };
}

function limitOf(input: RankingQueryInput): number {
  return input.limit ?? DEFAULT_LIMIT;
}

async function assertUserExists(userId: string): Promise<Types.ObjectId> {
  if (!isObjectId(userId)) throw HttpError.notFound('El usuario no existe');
  const oid = new Types.ObjectId(userId);
  const exists = await User.exists({ _id: oid });
  if (!exists) throw HttpError.notFound('El usuario no existe');
  return oid;
}

async function assertSelfOrAdmin(userId: string, user: UserDoc): Promise<Types.ObjectId> {
  if (user.role !== 'admin' && userId !== user.id) {
    throw HttpError.forbidden('No puedes consultar la información de otro usuario');
  }
  return assertUserExists(userId);
}

export async function filesByType(input: ReportQueryInput, user: UserDoc): Promise<FileTypeReportRow[]> {
  return File.aggregate([
    { $match: { ...fileScope(user), ...createdAtRange(input.from, input.to) } },
    { $group: { _id: '$extension', count: { $sum: 1 }, totalSize: { $sum: '$size' } } },
    { $project: { _id: 0, type: '$_id', count: 1, totalSize: 1 } },
    { $sort: { count: -1, type: 1 } }
  ]);
}

export async function filesByDate(input: ReportQueryInput, user: UserDoc): Promise<DateReportRow[]> {
  return File.aggregate([
    { $match: { ...fileScope(user), ...createdAtRange(input.from, input.to) } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    },
    { $project: { _id: 0, date: '$_id', count: 1, totalSize: 1 } },
    { $sort: { date: 1 } }
  ]);
}

export async function filesByOperations(input: RankingQueryInput, user: UserDoc): Promise<FileOperationsRow[]> {
  return Activity.aggregate([
    {
      $match: {
        'resource.type': 'file',
        ...createdAtRange(input.from, input.to),
        ...(user.role === 'admin' ? {} : { 'resource.ownerId': user._id })
      }
    },
    { $group: { _id: '$resource._id', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitOf(input) },
    { $lookup: { from: 'files', localField: '_id', foreignField: '_id', as: 'file' } },
    { $unwind: { path: '$file', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, fileId: '$_id', fileName: { $ifNull: ['$file.name', '(eliminado)'] }, count: 1 } }
  ]);
}

export async function topUsersByFiles(_input: RankingQueryInput, _user: UserDoc): Promise<UserFilesRow[]> {
  return File.aggregate([
    { $match: { deleted: false } },
    { $group: { _id: '$ownerId', count: { $sum: 1 }, totalSize: { $sum: '$size' } } },
    { $sort: { count: -1, totalSize: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { _id: 0, userId: '$_id', name: '$user.name', email: '$user.email', count: 1, totalSize: 1 } }
  ]);
}

export async function usersByShares(input: RankingQueryInput, _user: UserDoc): Promise<UserSharesRow[]> {
  return Share.aggregate([
    { $group: { _id: { owner: '$ownerId', type: '$resourceType', id: '$resourceId' } } },
    { $group: { _id: '$_id.owner', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitOf(input) },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { _id: 0, userId: '$_id', name: '$user.name', count: 1 } }
  ]);
}

export async function filesBySharedUsers(input: RankingQueryInput, user: UserDoc): Promise<SharedFileRow[]> {
  return Share.aggregate([
    ...(user.role === 'admin' ? [] : [{ $match: { ownerId: user._id } }]),
    { $match: { resourceType: 'file' } },
    { $group: { _id: '$resourceId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitOf(input) },
    { $lookup: { from: 'files', localField: '_id', foreignField: '_id', as: 'file' } },
    { $unwind: { path: '$file', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, fileId: '$_id', fileName: { $ifNull: ['$file.name', '(eliminado)'] }, count: 1 } }
  ]);
}

const resourceNameLookup: PipelineStage[] = [
  { $lookup: { from: 'files', localField: 'resourceId', foreignField: '_id', as: 'file' } },
  { $lookup: { from: 'folders', localField: 'resourceId', foreignField: '_id', as: 'folder' } }
];

const resourceNameProject: PipelineStage.Project = {
  $project: {
    resourceId: '$resourceId',
    resourceType: '$resourceType',
    permission: '$permission',
    createdAt: '$createdAt',
    resourceName: {
      $cond: [{ $eq: ['$resourceType', 'file'] }, { $first: '$file.name' }, { $first: '$folder.name' }]
    }
  }
};

export async function sharedByUser(userId: string, user: UserDoc): Promise<ShareResourceRow[]> {
  const owner = await assertSelfOrAdmin(userId, user);
  return Share.aggregate([
    { $match: { ownerId: owner } },
    { $lookup: { from: 'users', localField: 'sharedWithId', foreignField: '_id', as: 'recipient' } },
    ...resourceNameLookup,
    {
      $project: {
        ...resourceNameProject.$project,
        sharedWithName: { $first: '$recipient.name' }
      }
    },
    { $sort: { createdAt: -1 } }
  ]);
}

export async function receivedByUser(userId: string, user: UserDoc): Promise<ShareResourceRow[]> {
  const target = await assertSelfOrAdmin(userId, user);
  return Share.aggregate([
    { $match: { sharedWithId: target } },
    { $lookup: { from: 'users', localField: 'ownerId', foreignField: '_id', as: 'owner' } },
    ...resourceNameLookup,
    {
      $project: {
        ...resourceNameProject.$project,
        sharedWithName: { $first: '$owner.name' }
      }
    },
    { $sort: { createdAt: -1 } }
  ]);
}

export async function activityByAction(input: ReportQueryInput, user: UserDoc): Promise<ActivityReportRow[]> {
  return Activity.aggregate([
    { $match: { ...activityScope(user), ...createdAtRange(input.from, input.to) } },
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $project: { _id: 0, action: '$_id', count: 1 } },
    { $sort: { count: -1, action: 1 } }
  ]);
}

export async function activityByPeriod(input: PeriodQueryInput, user: UserDoc): Promise<PeriodReportRow[]> {
  const unit = input.period ?? 'day';
  const format = unit === 'month' ? '%Y-%m' : '%Y-%m-%d';
  return Activity.aggregate([
    { $match: { ...activityScope(user), ...createdAtRange(input.from, input.to) } },
    { $group: { _id: { $dateTrunc: { date: '$createdAt', unit } }, count: { $sum: 1 } } },
    { $project: { _id: 0, period: { $dateToString: { format, date: '$_id' } }, count: 1 } },
    { $sort: { period: 1 } }
  ]);
}

export async function topActions(input: RankingQueryInput, user: UserDoc): Promise<ActionPercentRow[]> {
  const pipeline: PipelineStage[] = [
    { $match: { ...activityScope(user), ...createdAtRange(input.from, input.to) } },
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $group: { _id: null, total: { $sum: '$count' }, actions: { $push: { action: '$_id', count: '$count' } } } },
    { $unwind: '$actions' },
    {
      $project: {
        _id: 0,
        action: '$actions.action',
        count: '$actions.count',
        total: '$total',
        percent: {
          $round: [{ $multiply: [{ $divide: ['$actions.count', '$total'] }, 100] }, 1]
        }
      }
    },
    { $limit: limitOf(input) }
  ];
  return Activity.aggregate(pipeline);
}

export async function storageUsage(input: ReportQueryInput, user: UserDoc): Promise<StorageReportRow[]> {
  const byOwner = user.role === 'admin';
  return File.aggregate([
    { $match: { ...fileScope(user), ...createdAtRange(input.from, input.to) } },
    {
      $group: {
        _id: byOwner ? '$ownerId' : { $ifNull: ['$folderId', 'root'] },
        count: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    },
    {
      $lookup: byOwner
        ? { from: 'users', localField: '_id', foreignField: '_id', as: 'group' }
        : { from: 'folders', localField: '_id', foreignField: '_id', as: 'group' }
    },
    {
      $project: {
        _id: 0,
        key: { $toString: '$_id' },
        label: byOwner
          ? { $first: '$group.name' }
          : {
              $cond: [
                { $eq: ['$_id', 'root'] },
                'Sin carpeta',
                { $ifNull: [{ $first: '$group.name' }, 'Carpeta'] }
              ]
            },
        count: 1,
        totalSize: 1
      }
    },
    { $sort: { totalSize: -1, label: 1 } }
  ]);
}
