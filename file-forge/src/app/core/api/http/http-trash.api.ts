import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceType, TrashItem } from '@app/core/models';
import { TrashApi } from '../trash.api';
import { API_URL } from './http-utils';

@Injectable()
export class HttpTrashApi extends TrashApi {
  private readonly http = inject(HttpClient);

  list(): Observable<TrashItem[]> {
    return this.http.get<TrashItem[]>(`${API_URL}/trash`);
  }

  restore(type: ResourceType, id: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/trash/${type}/${id}/restore`, {});
  }

  deletePermanent(type: ResourceType, id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/trash/${type}/${id}`);
  }
}
