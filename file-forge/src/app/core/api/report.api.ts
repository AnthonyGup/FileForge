import { Observable } from 'rxjs';
import {
  ActionPercentRow, ActivityReportRow, DateReportRow, FileOperationsRow, FileTypeReportRow,
  PeriodFilters, PeriodReportRow, RankingFilters, ReportFilters, ShareResourceRow,
  SharedFileRow, StorageReportRow, UserFilesRow, UserSharesRow,
} from '@app/core/models';

export abstract class ReportApi {
  abstract filesByType(filters?: ReportFilters): Observable<FileTypeReportRow[]>;
  abstract filesByDate(filters?: ReportFilters): Observable<DateReportRow[]>;
  abstract filesByOperations(filters?: RankingFilters): Observable<FileOperationsRow[]>;
  abstract topUsersByFiles(filters?: RankingFilters): Observable<UserFilesRow[]>;
  abstract usersByShares(filters?: RankingFilters): Observable<UserSharesRow[]>;
  abstract filesBySharedUsers(filters?: RankingFilters): Observable<SharedFileRow[]>;
  abstract sharedByUser(userId: string): Observable<ShareResourceRow[]>;
  abstract receivedByUser(userId: string): Observable<ShareResourceRow[]>;
  abstract activityByAction(filters?: ReportFilters): Observable<ActivityReportRow[]>;
  abstract activityByPeriod(filters?: PeriodFilters): Observable<PeriodReportRow[]>;
  abstract topActions(filters?: RankingFilters): Observable<ActionPercentRow[]>;
  abstract storageUsage(filters?: ReportFilters): Observable<StorageReportRow[]>;
}
