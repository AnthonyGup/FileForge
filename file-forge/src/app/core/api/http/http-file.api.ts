import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FileContent, FileFilters, FileItem, MoveFileRequest, Page, RenameFileRequest, UpdateFileContentRequest
} from '@app/core/models';
import { FileApi } from '../file.api';
import { API_URL, toParams } from './http-utils';

@Injectable()
export class HttpFileApi extends FileApi {
  private readonly http = inject(HttpClient);

  list(filters: FileFilters = {}): Observable<Page<FileItem>> {
    const { folderId, ...rest } = filters;
    let params: HttpParams = toParams(rest);
    if (folderId === null) params = params.set('folderId', 'root');
    else if (folderId !== undefined) params = params.set('folderId', folderId);
    return this.http.get<Page<FileItem>>(`${API_URL}/files`, { params });
  }

  get(id: string): Observable<FileItem> {
    return this.http.get<FileItem>(`${API_URL}/files/${id}`);
  }

  upload(file: File, folderId: string | null): Observable<FileItem> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (folderId !== null) form.append('folderId', folderId);
    return this.http.post<FileItem>(`${API_URL}/files`, form);
  }

  getContent(id: string): Observable<FileContent> {
    return this.http.get<FileContent>(`${API_URL}/files/${id}/content`);
  }

  updateContent(id: string, req: UpdateFileContentRequest): Observable<FileItem> {
    return this.http.put<FileItem>(`${API_URL}/files/${id}/content`, req);
  }

  download(id: string): Observable<Blob> {
    return this.http.get(`${API_URL}/files/${id}/download`, { responseType: 'blob' });
  }

  rename(id: string, req: RenameFileRequest): Observable<FileItem> {
    return this.http.patch<FileItem>(`${API_URL}/files/${id}`, req);
  }

  move(id: string, req: MoveFileRequest): Observable<FileItem> {
    return this.http.patch<FileItem>(`${API_URL}/files/${id}`, req);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/files/${id}`);
  }
}
