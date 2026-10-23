import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import { ResourceType } from '../models';
import * as trashService from '../services/trash.service';
import { HttpError } from '../utils/http-error';

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function target(req: Request): { type: ResourceType; id: string } {
  const type = param(req, 'type');
  if (type !== 'file' && type !== 'folder') {
    throw HttpError.badRequest('Tipo de recurso no válido');
  }
  return { type, id: param(req, 'id') };
}

export async function listTrashController(req: Request, res: Response): Promise<void> {
  res.json(await trashService.listTrash(currentUser(req)));
}

export async function restoreTrashController(req: Request, res: Response): Promise<void> {
  const { type, id } = target(req);
  await trashService.restoreTrash(type, id, currentUser(req));
  res.status(204).end();
}

export async function deletePermanentController(req: Request, res: Response): Promise<void> {
  const { type, id } = target(req);
  await trashService.deletePermanent(type, id, currentUser(req));
  res.status(204).end();
}
