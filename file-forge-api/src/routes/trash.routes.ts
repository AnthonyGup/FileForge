import { Router } from 'express';
import {
  deletePermanentController,
  listTrashController,
  restoreTrashController
} from '../controllers/trash.controller';
import { authenticate } from '../middlewares/authenticate';

export const trashRouter = Router();

trashRouter.use(authenticate);

trashRouter.get('/', listTrashController);
trashRouter.post('/:type/:id/restore', restoreTrashController);
trashRouter.delete('/:type/:id', deletePermanentController);
