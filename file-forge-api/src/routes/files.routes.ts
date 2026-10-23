import { Router } from 'express';
import {
  deleteFileController,
  downloadFileController,
  getContentController,
  getFileController,
  listFilesController,
  updateContentController,
  updateFileController,
  uploadFileController
} from '../controllers/files.controller';
import { authenticate } from '../middlewares/authenticate';
import { uploadSingle } from '../middlewares/upload';
import { commentsRouter } from './comments.routes';

export const filesRouter = Router();

filesRouter.use(authenticate);

filesRouter.use('/:fileId/comments', commentsRouter);
filesRouter.get('/', listFilesController);
filesRouter.post('/', uploadSingle, uploadFileController);
filesRouter.get('/:id/content', getContentController);
filesRouter.put('/:id/content', updateContentController);
filesRouter.get('/:id/download', downloadFileController);
filesRouter.get('/:id', getFileController);
filesRouter.patch('/:id', updateFileController);
filesRouter.delete('/:id', deleteFileController);
