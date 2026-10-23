import { Router } from 'express';
import {
  createCommentController,
  deleteCommentController,
  listCommentsController,
  updateCommentController
} from '../controllers/comments.controller';

export const commentsRouter = Router({ mergeParams: true });

commentsRouter.get('/', listCommentsController);
commentsRouter.post('/', createCommentController);
commentsRouter.patch('/:commentId', updateCommentController);
commentsRouter.delete('/:commentId', deleteCommentController);
