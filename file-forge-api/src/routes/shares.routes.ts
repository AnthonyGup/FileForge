import { Router } from 'express';
import {
  createShareController,
  listSharesController,
  revokeShareController,
  sharedByMeController,
  sharedWithMeController,
  updateShareController
} from '../controllers/shares.controller';
import { authenticate } from '../middlewares/authenticate';

export const sharesRouter = Router();

sharesRouter.use(authenticate);

sharesRouter.get('/by-me', sharedByMeController);
sharesRouter.get('/with-me', sharedWithMeController);
sharesRouter.get('/', listSharesController);
sharesRouter.post('/', createShareController);
sharesRouter.patch('/:id', updateShareController);
sharesRouter.delete('/:id', revokeShareController);
