import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActionPercentRow, ActivityReportRow, DateReportRow, FileOperationsRow, FileTypeReportRow,
  PeriodFilters, PeriodReportRow, RankingFilters, ReportFilters, ShareResourceRow,
  SharedFileRow, StorageReportRow, UserFilesRow, UserSharesRow,
} from '@app/core/models';
import { ReportApi } from '../report.api';
import { API_URL, toParams } from './http-utils';

@Injectable()
export class HttpReportApi extends ReportApi {
  private readonly http = inject(HttpClient);

  private get<T>(path: string, filters: object = {}): Observable<T> {
    return this.http.get<T>(`${API_URL}/reports/${path}`, { params: toParams(filters) });
  }

  filesByType(filters: ReportFilters = {}): Observable<FileTypeReportRow[]> {
    return this.get<FileTypeReportRow[]>('files-by-type', filters);
  }

  filesByDate(filters: ReportFilters = {}): Observable<DateReportRow[]> {
    return this.get<DateReportRow[]>('files-by-date', filters);
  }

  filesByOperations(filters: RankingFilters = {}): Observable<FileOperationsRow[]> {
    return this.get<FileOperationsRow[]>('files-by-operations', filters);
  }

  topUsersByFiles(filters: RankingFilters = {}): Observable<UserFilesRow[]> {
    return this.get<UserFilesRow[]>('top-users-by-files', filters);
  }

  usersByShares(filters: RankingFilters = {}): Observable<UserSharesRow[]> {
    return this.get<UserSharesRow[]>('users-by-shares', filters);
  }

  filesBySharedUsers(filters: RankingFilters = {}): Observable<SharedFileRow[]> {
    return this.get<SharedFileRow[]>('files-by-shared-users', filters);
  }

  sharedByUser(userId: string): Observable<ShareResourceRow[]> {
    return this.get<ShareResourceRow[]>(`shared-by-user/${userId}`);
  }

  receivedByUser(userId: string): Observable<ShareResourceRow[]> {
    return this.get<ShareResourceRow[]>(`received-by-user/${userId}`);
  }

  activityByAction(filters: ReportFilters = {}): Observable<ActivityReportRow[]> {
    return this.get<ActivityReportRow[]>('activity-by-action', filters);
  }

  activityByPeriod(filters: PeriodFilters = {}): Observable<PeriodReportRow[]> {
    return this.get<PeriodReportRow[]>('activity-by-period', filters);
  }

  topActions(filters: RankingFilters = {}): Observable<ActionPercentRow[]> {
    return this.get<ActionPercentRow[]>('top-actions', filters);
  }

  storageUsage(filters: ReportFilters = {}): Observable<StorageReportRow[]> {
    return this.get<StorageReportRow[]>('storage-usage', filters);
  }
}
