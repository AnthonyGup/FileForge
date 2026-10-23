import { Router } from 'express';
import {
  activityByActionController,
  activityByPeriodController,
  filesByDateController,
  filesByOperationsController,
  filesBySharedUsersController,
  filesByTypeController,
  receivedByUserController,
  sharedByUserController,
  storageUsageController,
  topActionsController,
  topUsersByFilesController,
  usersBySharesController
} from '../controllers/reports.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/require-admin';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.get('/files-by-type', filesByTypeController);
reportsRouter.get('/files-by-date', filesByDateController);
reportsRouter.get('/files-by-operations', filesByOperationsController);
reportsRouter.get('/top-users-by-files', requireAdmin, topUsersByFilesController);
reportsRouter.get('/users-by-shares', requireAdmin, usersBySharesController);
reportsRouter.get('/files-by-shared-users', filesBySharedUsersController);
reportsRouter.get('/shared-by-user/:userId', sharedByUserController);
reportsRouter.get('/received-by-user/:userId', receivedByUserController);
reportsRouter.get('/activity-by-action', activityByActionController);
reportsRouter.get('/activity-by-period', activityByPeriodController);
reportsRouter.get('/top-actions', topActionsController);
reportsRouter.get('/storage-usage', storageUsageController);
