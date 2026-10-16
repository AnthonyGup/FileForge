import { Router } from 'express';
import {
  createUserController,
  listForSharingController,
  listUsersController,
  updateUserController
} from '../controllers/users.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/require-admin';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/sharing', listForSharingController);
usersRouter.get('/', requireAdmin, listUsersController);
usersRouter.post('/', requireAdmin, createUserController);
usersRouter.patch('/:id', requireAdmin, updateUserController);