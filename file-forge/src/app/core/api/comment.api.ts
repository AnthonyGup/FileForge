import { Observable } from 'rxjs';
import { Comment, CreateCommentRequest, UpdateCommentRequest } from '@app/core/models';

export abstract class CommentApi {
  abstract list(fileId: string): Observable<Comment[]>;
  abstract create(fileId: string, req: CreateCommentRequest): Observable<Comment>;
  abstract update(fileId: string, commentId: string, req: UpdateCommentRequest): Observable<Comment>;
  abstract remove(fileId: string, commentId: string): Observable<void>;
}