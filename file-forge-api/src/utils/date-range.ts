import { HttpError } from './http-error';

function dayBoundary(value: string, end: boolean): Date {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`
    : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw HttpError.badRequest('La fecha no es válida');
  }
  return date;
}

export function createdAtRange(from?: string, to?: string): Record<string, unknown> {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { $gte: dayBoundary(from, false) } : {}),
      ...(to ? { $lte: dayBoundary(to, true) } : {})
    }
  };
}
