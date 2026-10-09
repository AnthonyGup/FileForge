import { Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiError, Page } from '@app/core/models';

export const MOCK_DELAY = 300;

export const newId = (): string =>
  crypto.randomUUID().replace(/-/g, '').slice(0, 24);

export const now = (): string => new Date().toISOString();

/** Lanza un error con la misma forma que devolverá la API real. */
export function fail(status: number, message: string): never {
  const error: ApiError = { status, message };
  throw error;
}

/** Ejecuta la función tras un retardo; si lanza, el Observable emite error. */
export const respond = <T>(fn: () => T): Observable<T> =>
  timer(MOCK_DELAY).pipe(map(() => fn()));

export function paginate<T>(items: T[], page = 1, pageSize = 10): Page<T> {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}