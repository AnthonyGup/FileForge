import { Router } from "express";
import { healthRouter } from "./health.routes";
import { authRouter } from "./auth.routes";
import { usersRouter } from "./users.routes";
import { filesRouter } from './files.routes';
import { foldersRouter } from './folders.routes';
import { sharesRouter } from './shares.routes';
import { trashRouter } from './trash.routes';
import { activityRouter } from './activity.routes';
import { reportsRouter } from './reports.routes';

export const router = Router();

router.use('/folders', foldersRouter);
router.use('/files', filesRouter);
router.use('/shares', sharesRouter);
router.use('/trash', trashRouter);
router.use('/activity', activityRouter);
router.use('/reports', reportsRouter);
router.use("/health", healthRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);