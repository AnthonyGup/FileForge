import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Comment, CreateCommentRequest, UpdateCommentRequest } from '@app/core/models';
import { CommentApi } from '../comment.api';
import { API_URL } from './http-utils';

@Injectable()
export class HttpCommentApi extends CommentApi {
  private readonly http = inject(HttpClient);

  list(fileId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${API_URL}/files/${fileId}/comments`);
  }

  create(fileId: string, req: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(`${API_URL}/files/${fileId}/comments`, req);
  }

  update(fileId: string, commentId: string, req: UpdateCommentRequest): Observable<Comment> {
    return this.http.patch<Comment>(`${API_URL}/files/${fileId}/comments/${commentId}`, req);
  }

  remove(fileId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/files/${fileId}/comments/${commentId}`);
  }
}
