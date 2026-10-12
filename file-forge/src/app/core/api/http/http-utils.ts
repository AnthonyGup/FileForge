import { HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

/** URL base de la API REST. */
export const API_URL = environment.apiUrl;

/**
 * Construye `HttpParams` descartando valores `undefined`, `null` o vacíos.
 */
export function toParams(source: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

/** Codifica el folderId de un filtro: `undefined` se omite (búsqueda global), `null` = raíz. */
export function folderParam(folderId: string | null | undefined): string | null {
  if (folderId === undefined) return null;
  return folderId === null ? 'root' : folderId;
}
