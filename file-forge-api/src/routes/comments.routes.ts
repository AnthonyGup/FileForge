import { Router } from 'express';
import {
  createCommentController,
  listCommentsController
} from '../controllers/comments.controller';

export const commentsRouter = Router({ mergeParams: true });

commentsRouter.get('/', listCommentsController);
commentsRouter.post('/', createCommentController);
