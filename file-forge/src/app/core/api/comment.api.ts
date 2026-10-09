import { Observable } from 'rxjs';
import { Comment, CreateCommentRequest } from '@app/core/models';

export abstract class CommentApi {
  abstract list(fileId: string): Observable<Comment[]>;
  abstract create(fileId: string, req: CreateCommentRequest): Observable<Comment>;
}