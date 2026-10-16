import { Router } from "express";
import { healthRouter } from "./health.routes";
import { authRouter } from "./auth.routes";
import { usersRouter } from "./users.routes";
import { filesRouter } from './files.routes';
import { foldersRouter } from './folders.routes';

export const router = Router();

router.use('/folders', foldersRouter);
router.use('/files', filesRouter);
router.use("/health", healthRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);