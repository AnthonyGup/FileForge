import { FileExtension } from './file.model';
import { ActivityAction } from './activity.model';
import { ISODateString, PermissionLevel, ResourceType } from './common.model';

export interface ReportFilters {
  from?: ISODateString;
  to?: ISODateString;
}

export interface RankingFilters extends ReportFilters {
  limit?: number;
}

export type ReportPeriod = 'day' | 'week' | 'month';

export interface PeriodFilters extends ReportFilters {
  period?: ReportPeriod;
}

export interface FileTypeReportRow {
  type: FileExtension;
  count: number;
  totalSize: number;
}

export interface ActivityReportRow {
  action: ActivityAction;
  count: number;
}

export interface StorageReportRow {
  key: string;
  label: string;
  count: number;
  totalSize: number;
}

export interface DateReportRow {
  date: ISODateString;
  count: number;
  totalSize: number;
}

export interface FileOperationsRow {
  fileId: string;
  fileName: string;
  count: number;
}

export interface UserFilesRow {
  userId: string;
  name: string;
  email: string;
  count: number;
  totalSize: number;
}

export interface UserSharesRow {
  userId: string;
  name: string;
  count: number;
}

export interface SharedFileRow {
  fileId: string;
  fileName: string;
  count: number;
}

export interface ShareResourceRow {
  resourceId: string;
  resourceType: ResourceType;
  resourceName: string | null;
  permission: PermissionLevel;
  sharedWithName: string;
  createdAt: ISODateString;
}

export interface PeriodReportRow {
  period: string;
  count: number;
}

export interface ActionPercentRow {
  action: ActivityAction;
  count: number;
  total: number;
  percent: number;
}
