import { Observable } from 'rxjs';
import { ActivityReportRow, FileTypeReportRow, ReportFilters, StorageReportRow } from '@app/core/models';

export abstract class ReportApi {
  abstract filesByType(filters?: ReportFilters): Observable<FileTypeReportRow[]>;
  abstract activityByAction(filters?: ReportFilters): Observable<ActivityReportRow[]>;
  abstract storageUsage(filters?: ReportFilters): Observable<StorageReportRow[]>;
}
