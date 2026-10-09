import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Comment, CreateCommentRequest } from '@app/core/models';
import { CommentApi } from '../comment.api';
import { MockDb } from '../../mock/mock-db';
import { fail, newId, now, respond } from '../../mock/mock-utils';

@Injectable()
export class MockCommentApi extends CommentApi {
  private readonly db = inject(MockDb);

  list(fileId: string): Observable<Comment[]> {
    return respond(() => {
      this.db.assertAccess('file', fileId, 'read');
      return this.db.comments
        .filter(c => c.fileId === fileId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }

  create(fileId: string, req: CreateCommentRequest): Observable<Comment> {
    return respond(() => {
      this.db.assertAccess('file', fileId, 'comment');
      const text = req.text.trim();
      if (!text) fail(400, 'El comentario no puede estar vacío');

      const me = this.db.me;
      const file = this.db.file(fileId);
      const comment: Comment = {
        id: newId(), fileId,
        author: { id: me.id, name: me.name },
        text, createdAt: now()
      };
      this.db.comments.push(comment);
      this.db.log('comment', this.db.resRef('file', file));
      return comment;
    });
  }
}