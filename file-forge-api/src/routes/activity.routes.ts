import { Router } from 'express';
import { listActivityController } from '../controllers/activity.controller';
import { authenticate } from '../middlewares/authenticate';

export const activityRouter = Router();

activityRouter.use(authenticate);

activityRouter.get('/', listActivityController);
