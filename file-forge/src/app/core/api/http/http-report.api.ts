import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityReportRow, FileTypeReportRow, ReportFilters, StorageReportRow } from '@app/core/models';
import { ReportApi } from '../report.api';
import { API_URL, toParams } from './http-utils';

@Injectable()
export class HttpReportApi extends ReportApi {
  private readonly http = inject(HttpClient);

  filesByType(filters: ReportFilters = {}): Observable<FileTypeReportRow[]> {
    return this.http.get<FileTypeReportRow[]>(`${API_URL}/reports/files-by-type`, { params: toParams(filters) });
  }

  activityByAction(filters: ReportFilters = {}): Observable<ActivityReportRow[]> {
    return this.http.get<ActivityReportRow[]>(`${API_URL}/reports/activity-by-action`, { params: toParams(filters) });
  }

  storageUsage(filters: ReportFilters = {}): Observable<StorageReportRow[]> {
    return this.http.get<StorageReportRow[]>(`${API_URL}/reports/storage-usage`, { params: toParams(filters) });
  }
}
