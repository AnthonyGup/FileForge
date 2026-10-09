import { Observable } from 'rxjs';
import {
  BreadcrumbItem, CreateFolderRequest, Folder, MoveFolderRequest, RenameFolderRequest
} from '@app/core/models';

export abstract class FolderApi {
  abstract list(parentId: string | null): Observable<Folder[]>;
  abstract get(id: string): Observable<Folder>;
  abstract breadcrumb(id: string | null): Observable<BreadcrumbItem[]>;
  abstract create(req: CreateFolderRequest): Observable<Folder>;
  abstract rename(id: string, req: RenameFolderRequest): Observable<Folder>;
  abstract move(id: string, req: MoveFolderRequest): Observable<Folder>;
  /** Envía a la papelera (borrado lógico en cascada). */
  abstract remove(id: string): Observable<void>;
}