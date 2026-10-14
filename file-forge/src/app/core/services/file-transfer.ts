import { Injectable, inject } from '@angular/core';
import { Observable, catchError, concatMap, from, map, of } from 'rxjs';
import { ApiError, FileItem } from '@app/core/models';
import { FileApi } from '@app/core/api';

export const ALLOWED_PATTERN = /\.(txt|md)$/i;

export interface UploadResult {
  name: string;
  ok: boolean;
  file?: FileItem;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class FileTransfer {
  private readonly fileApi = inject(FileApi);

  /** Devuelve el motivo del rechazo o null si el archivo es válido. */
  validate(file: File): string | null {
    if (!ALLOWED_PATTERN.test(file.name)) return 'Solo se permiten archivos .txt y .md';
    return null;
  }

  /** Sube los archivos uno por uno; emite un resultado por archivo (nunca falla). */
  uploadMany(files: File[], folderId: string | null): Observable<UploadResult> {
    return from(files).pipe(
      concatMap(file => {
        const invalid = this.validate(file);
        if (invalid) {
          return of<UploadResult>({ name: file.name, ok: false, error: invalid });
        }
        return this.fileApi.upload(file, folderId).pipe(
          map((item): UploadResult => ({ name: file.name, ok: true, file: item })),
          catchError((e: ApiError) => of<UploadResult>({ name: file.name, ok: false, error: e.message }))
        );
      })
    );
  }

  download(file: FileItem): Observable<void> {
    return this.fileApi.download(file.id).pipe(map(blob => this.saveBlob(blob, file.name)));
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url));
  }
}