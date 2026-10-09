import { Observable } from 'rxjs';
import {
  FileContent, FileFilters, FileItem, MoveFileRequest, Page, RenameFileRequest, UpdateFileContentRequest
} from '@app/core/models';

export abstract class FileApi {
  /** folderId: undefined = búsqueda global, null = raíz, string = carpeta. */
  abstract list(filters?: FileFilters): Observable<Page<FileItem>>;
  abstract get(id: string): Observable<FileItem>;
  abstract upload(file: File, folderId: string | null): Observable<FileItem>;
  abstract getContent(id: string): Observable<FileContent>;
  abstract updateContent(id: string, req: UpdateFileContentRequest): Observable<FileItem>;
  abstract download(id: string): Observable<Blob>;
  abstract rename(id: string, req: RenameFileRequest): Observable<FileItem>;
  abstract move(id: string, req: MoveFileRequest): Observable<FileItem>;
  abstract remove(id: string): Observable<void>;
}