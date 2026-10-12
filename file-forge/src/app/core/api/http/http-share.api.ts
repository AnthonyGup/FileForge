import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateShareRequest, ResourceType, Share, ShareView, UpdateShareRequest } from '@app/core/models';
import { ShareApi } from '../share.api';
import { API_URL, toParams } from './http-utils';

@Injectable()
export class HttpShareApi extends ShareApi {
  private readonly http = inject(HttpClient);

  create(req: CreateShareRequest): Observable<Share> {
    return this.http.post<Share>(`${API_URL}/shares`, req);
  }

  update(id: string, req: UpdateShareRequest): Observable<Share> {
    return this.http.patch<Share>(`${API_URL}/shares/${id}`, req);
  }

  revoke(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/shares/${id}`);
  }

  listByResource(type: ResourceType, id: string): Observable<ShareView[]> {
    return this.http.get<ShareView[]>(`${API_URL}/shares`, { params: toParams({ resourceType: type, resourceId: id }) });
  }

  sharedByMe(): Observable<ShareView[]> {
    return this.http.get<ShareView[]>(`${API_URL}/shares/by-me`);
  }

  sharedWithMe(): Observable<ShareView[]> {
    return this.http.get<ShareView[]>(`${API_URL}/shares/with-me`);
  }
}
