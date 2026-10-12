export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string): HttpError { return new HttpError(400, message); }
  static unauthorized(message = 'No autenticado'): HttpError { return new HttpError(401, message); }
  static forbidden(message = 'No tienes permiso para esta operación'): HttpError { return new HttpError(403, message); }
  static notFound(message = 'El recurso no existe'): HttpError { return new HttpError(404, message); }
  static conflict(message: string): HttpError { return new HttpError(409, message); }
  static payloadTooLarge(message: string): HttpError { return new HttpError(413, message); }
}
