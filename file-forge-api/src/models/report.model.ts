import { ActivityAction, FileExtension, PermissionLevel, ResourceType } from './constants';

export interface FileTypeReportRow { type: FileExtension; count: number; totalSize: number; }
export interface ActivityReportRow { action: ActivityAction; count: number; }
export interface DateReportRow { date: string; count: number; totalSize: number; }
export interface FileOperationsRow { fileId: string; fileName: string; count: number; }
export interface UserFilesRow { userId: string; name: string; email: string; count: number; totalSize: number; }
export interface UserSharesRow { userId: string; name: string; count: number; }
export interface SharedFileRow { fileId: string; fileName: string; count: number; }
export interface ShareResourceRow {
  resourceId: string;
  resourceType: ResourceType;
  resourceName: string | null;
  permission: PermissionLevel;
  sharedWithName: string;
  createdAt: Date;
}
export interface PeriodReportRow { period: string; count: number; }
export interface ActionPercentRow { action: ActivityAction; count: number; total: number; percent: number; }
export interface StorageReportRow { key: string; label: string; count: number; totalSize: number; }
