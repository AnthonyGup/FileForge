import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import { listActivityQuerySchema } from '../schemas/activity.schemas';
import * as activityService from '../services/activity.service';
import { parse } from '../utils/validate';

export async function listActivityController(req: Request, res: Response): Promise<void> {
  const filters = parse(listActivityQuerySchema, req.query);
  res.json(await activityService.listActivity(filters, currentUser(req)));
}
