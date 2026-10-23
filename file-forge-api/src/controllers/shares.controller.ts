import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import {
  createShareSchema,
  listSharesQuerySchema,
  updateShareSchema
} from '../schemas/share.schemas';
import * as sharesService from '../services/shares.service';
import { parse } from '../utils/validate';

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export async function createShareController(req: Request, res: Response): Promise<void> {
  const data = parse(createShareSchema, req.body);
  res.status(201).json(await sharesService.createShare(data, currentUser(req)));
}

export async function listSharesController(req: Request, res: Response): Promise<void> {
  const query = parse(listSharesQuerySchema, req.query);
  res.json(await sharesService.listSharesByResource(query, currentUser(req)));
}

export async function sharedByMeController(req: Request, res: Response): Promise<void> {
  res.json(await sharesService.sharedByMe(currentUser(req)));
}

export async function sharedWithMeController(req: Request, res: Response): Promise<void> {
  res.json(await sharesService.sharedWithMe(currentUser(req)));
}

export async function updateShareController(req: Request, res: Response): Promise<void> {
  const data = parse(updateShareSchema, req.body);
  res.json(await sharesService.updateShare(paramId(req), data, currentUser(req)));
}

export async function revokeShareController(req: Request, res: Response): Promise<void> {
  await sharesService.revokeShare(paramId(req), currentUser(req));
  res.status(204).end();
}
