import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BreadcrumbItem, CreateFolderRequest, Folder, MoveFolderRequest, RenameFolderRequest
} from '@app/core/models';
import { FolderApi } from '../folder.api';
import { API_URL, toParams } from './http-utils';

@Injectable()
export class HttpFolderApi extends FolderApi {
  private readonly http = inject(HttpClient);

  list(parentId: string | null): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${API_URL}/folders`, { params: toParams({ parentId }) });
  }

  get(id: string): Observable<Folder> {
    return this.http.get<Folder>(`${API_URL}/folders/${id}`);
  }

  breadcrumb(id: string | null): Observable<BreadcrumbItem[]> {
    const url = id === null ? `${API_URL}/folders/breadcrumb` : `${API_URL}/folders/${id}/breadcrumb`;
    return this.http.get<BreadcrumbItem[]>(url);
  }

  create(req: CreateFolderRequest): Observable<Folder> {
    return this.http.post<Folder>(`${API_URL}/folders`, req);
  }

  rename(id: string, req: RenameFolderRequest): Observable<Folder> {
    return this.http.patch<Folder>(`${API_URL}/folders/${id}`, req);
  }

  move(id: string, req: MoveFolderRequest): Observable<Folder> {
    return this.http.patch<Folder>(`${API_URL}/folders/${id}`, req);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/folders/${id}`);
  }
}
