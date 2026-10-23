import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import { createCommentSchema, updateCommentSchema } from '../schemas/comment.schemas';
import * as commentsService from '../services/comments.service';
import { parse } from '../utils/validate';

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function listCommentsController(req: Request, res: Response): Promise<void> {
  res.json(await commentsService.listComments(param(req, 'fileId'), currentUser(req)));
}

export async function createCommentController(req: Request, res: Response): Promise<void> {
  const { text } = parse(createCommentSchema, req.body);
  res.status(201).json(await commentsService.createComment(param(req, 'fileId'), text, currentUser(req)));
}

export async function updateCommentController(req: Request, res: Response): Promise<void> {
  const { text } = parse(updateCommentSchema, req.body);
  res.json(
    await commentsService.updateComment(
      param(req, 'fileId'),
      param(req, 'commentId'),
      text,
      currentUser(req)
    )
  );
}

export async function deleteCommentController(req: Request, res: Response): Promise<void> {
  await commentsService.deleteComment(
    param(req, 'fileId'),
    param(req, 'commentId'),
    currentUser(req)
  );
  res.status(204).end();
}
