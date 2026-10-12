import { RequestHandler } from 'express';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
};
