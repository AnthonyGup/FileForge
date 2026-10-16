import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import { createUserSchema, updateUserSchema } from '../schemas/user.schemas';
import * as usersService from '../services/users.service';
import { parse } from '../utils/validate';

export async function listUsersController(_req: Request, res: Response): Promise<void> {
  res.json(await usersService.listUsers());
}

export async function listForSharingController(req: Request, res: Response): Promise<void> {
  res.json(await usersService.listForSharing(currentUser(req)));
}

export async function createUserController(req: Request, res: Response): Promise<void> {
  const data = parse(createUserSchema, req.body);
  res.status(201).json(await usersService.createUser(data));
}

export async function updateUserController(req: Request, res: Response): Promise<void> {
  const data = parse(updateUserSchema, req.body);
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  res.json(await usersService.updateUser(id, data, currentUser(req)));
}