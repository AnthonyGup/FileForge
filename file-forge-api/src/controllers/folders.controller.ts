import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import { createFolderSchema, listFoldersQuerySchema, updateFolderSchema } from '../schemas/folder.schemas';
import * as foldersService from '../services/folders.service';
import { parse } from '../utils/validate';

export async function listFoldersController(req: Request, res: Response): Promise<void> {
    const { parentId } = parse(listFoldersQuerySchema, req.query);
    res.json(await foldersService.listFolders(parentId, currentUser(req)));
}

export async function getFolderController(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await foldersService.getFolder(id, currentUser(req)));
}

export async function rootBreadcrumbController(req: Request, res: Response): Promise<void> {
    res.json(await foldersService.getBreadcrumb(null, currentUser(req)));
}

export async function breadcrumbController(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await foldersService.getBreadcrumb(id, currentUser(req)));
}

export async function createFolderController(req: Request, res: Response): Promise<void> {
    const data = parse(createFolderSchema, req.body);
    res.status(201).json(await foldersService.createFolder(data, currentUser(req)));
}

export async function updateFolderController(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = parse(updateFolderSchema, req.body);
    res.json(await foldersService.updateFolder(id, data, currentUser(req)));
}

export async function deleteFolderController(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await foldersService.deleteFolder(id, currentUser(req));
    res.status(204).end();
}