import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import { createCommentSchema } from '../schemas/comment.schemas';
import * as commentsService from '../services/comments.service';
import { parse } from '../utils/validate';

function fileIdParam(req: Request): string {
  return Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
}

export async function listCommentsController(req: Request, res: Response): Promise<void> {
  res.json(await commentsService.listComments(fileIdParam(req), currentUser(req)));
}

export async function createCommentController(req: Request, res: Response): Promise<void> {
  const { text } = parse(createCommentSchema, req.body);
  res.status(201).json(await commentsService.createComment(fileIdParam(req), text, currentUser(req)));
}
