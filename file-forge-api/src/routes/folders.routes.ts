import { Router } from 'express';
import {
    breadcrumbController,
    createFolderController,
    getFolderController,
    listFoldersController,
    rootBreadcrumbController,
    updateFolderController
} from '../controllers/folders.controller';
import { authenticate } from '../middlewares/authenticate';

export const foldersRouter = Router();

foldersRouter.use(authenticate);

foldersRouter.get('/', listFoldersController);
foldersRouter.get('/breadcrumb', rootBreadcrumbController);   // antes de '/:id'
foldersRouter.post('/', createFolderController);
foldersRouter.get('/:id', getFolderController);
foldersRouter.get('/:id/breadcrumb', breadcrumbController);
foldersRouter.patch('/:id', updateFolderController);