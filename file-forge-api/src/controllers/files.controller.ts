import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import {
  listFilesQuerySchema,
  updateContentSchema,
  updateFileSchema,
  uploadFileSchema
} from '../schemas/file.schemas';
import * as filesService from '../services/files.service';
import { openContentStream } from '../utils/gridfs';
import { HttpError } from '../utils/http-error';
import { parse } from '../utils/validate';

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

function contentDisposition(name: string): string {
  const fallback = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function uploadFileController(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw HttpError.badRequest('No se recibió ningún archivo');
  }
  const data = parse(uploadFileSchema, req.body);
  const file = await filesService.uploadFile(
    req.file.buffer,
    req.file.originalname,
    data,
    currentUser(req)
  );
  res.status(201).json(file);
}

export async function listFilesController(req: Request, res: Response): Promise<void> {
  const filters = parse(listFilesQuerySchema, req.query);
  res.json(await filesService.listFiles(filters, currentUser(req)));
}

export async function getFileController(req: Request, res: Response): Promise<void> {
  res.json(await filesService.getFile(paramId(req), currentUser(req)));
}

export async function getContentController(req: Request, res: Response): Promise<void> {
  res.json(await filesService.getFileContent(paramId(req), currentUser(req)));
}

export async function updateContentController(req: Request, res: Response): Promise<void> {
  const { content } = parse(updateContentSchema, req.body);
  res.json(await filesService.updateFileContent(paramId(req), content, currentUser(req)));
}

export async function downloadFileController(req: Request, res: Response): Promise<void> {
  const file = await filesService.downloadFile(paramId(req), currentUser(req));
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', contentDisposition(file.name));
  const stream = openContentStream(file.contentId);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

export async function updateFileController(req: Request, res: Response): Promise<void> {
  const data = parse(updateFileSchema, req.body);
  res.json(await filesService.updateFile(paramId(req), data, currentUser(req)));
}
