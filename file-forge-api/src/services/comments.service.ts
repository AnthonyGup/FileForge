import { Types } from 'mongoose';
import { Comment, CommentDoc, UserDoc } from '../models';
import { HttpError } from '../utils/http-error';
import { isObjectId } from '../utils/object-id';
import { fileRef, logActivity } from './activity.service';
import { assertFileAccess } from './permission.service';

async function loadComment(
  fileId: Types.ObjectId,
  commentId: string
): Promise<CommentDoc> {
  if (!isObjectId(commentId)) {
    throw HttpError.notFound('El comentario no existe');
  }
  const comment = await Comment.findOne({ _id: commentId, fileId });
  if (!comment) {
    throw HttpError.notFound('El comentario no existe');
  }
  return comment;
}

function cleanText(text: string): string {
  const clean = text.trim();
  if (!clean) {
    throw HttpError.badRequest('El comentario no puede estar vacío');
  }
  return clean;
}

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

  const comment = await Comment.create({
    fileId: file._id,
    author: { _id: user._id, name: user.name },
    text: cleanText(text)
  });

  await logActivity({ user, action: 'comment', resource: fileRef(file) });
  return comment;
}

export async function updateComment(
  fileId: string,
  commentId: string,
  text: string,
  user: UserDoc
): Promise<CommentDoc> {
  const file = await assertFileAccess(fileId, 'comment', user);
  const comment = await loadComment(file._id, commentId);

  if (!comment.author._id.equals(user._id)) {
    throw HttpError.forbidden('Solo el autor puede editar su comentario');
  }

  const clean = cleanText(text);
  if (clean === comment.text) {
    return comment;
  }

  comment.text = clean;
  await comment.save();

  await logActivity({ user, action: 'update_comment', resource: fileRef(file) });
  return comment;
}

export async function deleteComment(
  fileId: string,
  commentId: string,
  user: UserDoc
): Promise<void> {
  const file = await assertFileAccess(fileId, 'read', user);
  const comment = await loadComment(file._id, commentId);

  const isAuthor = comment.author._id.equals(user._id);
  const isOwner = file.ownerId.equals(user._id);
  if (!isAuthor && !isOwner && user.role !== 'admin') {
    throw HttpError.forbidden('No puedes eliminar este comentario');
  }

  await comment.deleteOne();
  await logActivity({ user, action: 'delete_comment', resource: fileRef(file) });
}
