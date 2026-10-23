import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import {
  periodQuerySchema,
  rankingQuerySchema,
  reportQuerySchema,
  userReportQuerySchema
} from '../schemas/report.schemas';
import * as reportsService from '../services/reports.service';
import { parse } from '../utils/validate';

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function filesByTypeController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.filesByType(parse(reportQuerySchema, req.query), currentUser(req)));
}

export async function filesByDateController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.filesByDate(parse(reportQuerySchema, req.query), currentUser(req)));
}

export async function filesByOperationsController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.filesByOperations(parse(rankingQuerySchema, req.query), currentUser(req)));
}

export async function topUsersByFilesController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.topUsersByFiles(parse(rankingQuerySchema, req.query), currentUser(req)));
}

export async function usersBySharesController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.usersByShares(parse(rankingQuerySchema, req.query), currentUser(req)));
}

export async function filesBySharedUsersController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.filesBySharedUsers(parse(rankingQuerySchema, req.query), currentUser(req)));
}

export async function sharedByUserController(req: Request, res: Response): Promise<void> {
  const { userId } = parse(userReportQuerySchema, { userId: param(req, 'userId') });
  res.json(await reportsService.sharedByUser(userId, currentUser(req)));
}

export async function receivedByUserController(req: Request, res: Response): Promise<void> {
  const { userId } = parse(userReportQuerySchema, { userId: param(req, 'userId') });
  res.json(await reportsService.receivedByUser(userId, currentUser(req)));
}

export async function activityByActionController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.activityByAction(parse(reportQuerySchema, req.query), currentUser(req)));
}

export async function activityByPeriodController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.activityByPeriod(parse(periodQuerySchema, req.query), currentUser(req)));
}

export async function topActionsController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.topActions(parse(rankingQuerySchema, req.query), currentUser(req)));
}

export async function storageUsageController(req: Request, res: Response): Promise<void> {
  res.json(await reportsService.storageUsage(parse(reportQuerySchema, req.query), currentUser(req)));
}
