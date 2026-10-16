import { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { HttpError } from '../utils/http-error';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  // JSON mal formado en el cuerpo de la petición
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'El cuerpo de la solicitud no es un JSON válido' });
    return;
  }

  // Id con formato inválido en una consulta de Mongoose
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: 'Identificador no válido' });
    return;
  }

  // Validaciones del schema
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors).map(e => e.message).join('. ');
    res.status(400).json({ message });
    return;
  }

  // Índice único violado (por ejemplo, nombre repetido en la misma carpeta)
  if (err?.code === 11000) {
    res.status(409).json({ message: 'Ya existe un registro con esos datos' });
    return;
  }

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      message: tooLarge ? 'El archivo es demasiado grande' : 'No se pudo procesar el archivo'
    });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Ocurrió un error inesperado' });
};
