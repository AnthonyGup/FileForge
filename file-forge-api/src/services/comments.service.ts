import { Comment, CommentDoc, UserDoc } from '../models';
import { HttpError } from '../utils/http-error';
import { fileRef, logActivity } from './activity.service';
import { assertFileAccess } from './permission.service';

export async function listComments(fileId: string, user: UserDoc): Promise<CommentDoc[]> {
  await assertFileAccess(fileId, 'read', user);
  return Comment.find({ fileId }).sort({ createdAt: 1 });
}

export async function createComment(
  fileId: string,
  text: string,
  user: UserDoc
): Promise<CommentDoc> {
  const file = await assertFileAccess(fileId, 'comment', user);

  const clean = text.trim();
  if (!clean) {
    throw HttpError.badRequest('El comentario no puede estar vacío');
  }

  const comment = await Comment.create({
    fileId: file._id,
    author: { _id: user._id, name: user.name },
    text: clean
  });

  await logActivity({ user, action: 'comment', resource: fileRef(file) });
  return comment;
}
