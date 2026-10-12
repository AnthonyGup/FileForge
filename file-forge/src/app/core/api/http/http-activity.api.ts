import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Activity, ActivityFilters, Page } from '@app/core/models';
import { ActivityApi } from '../activity.api';
import { API_URL, toParams } from './http-utils';

@Injectable()
export class HttpActivityApi extends ActivityApi {
  private readonly http = inject(HttpClient);

  list(filters: ActivityFilters = {}): Observable<Page<Activity>> {
    return this.http.get<Page<Activity>>(`${API_URL}/activity`, { params: toParams(filters) });
  }
}
