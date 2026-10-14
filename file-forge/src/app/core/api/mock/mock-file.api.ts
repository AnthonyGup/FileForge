import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  FileContent, FileExtension, FileFilters, FileItem, MoveFileRequest, Page,
  RenameFileRequest, UpdateFileContentRequest
} from '@app/core/models';
import { FileApi } from '../file.api';
import { MockDb } from '../../mock/mock-db';
import { MOCK_DELAY, fail, newId, now, paginate, respond } from '../../mock/mock-utils';

@Injectable()
export class MockFileApi extends FileApi {
  private readonly db = inject(MockDb);

  list(filters: FileFilters = {}): Observable<Page<FileItem>> {
    return respond(() => {
      const me = this.db.me;
      let items: FileItem[];

      if (filters.folderId === undefined) {
        items = this.db.files.filter(f => !f.deleted && this.db.permissionOn('file', f.id, me.id) !== null);
      } else if (filters.folderId === null) {
        items = this.db.files.filter(f => !f.deleted && f.folderId === null && f.ownerId === me.id);
      } else {
        this.db.assertAccess('folder', filters.folderId, 'read');
        items = this.db.files.filter(f => !f.deleted && f.folderId === filters.folderId);
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter(f => f.name.toLowerCase().includes(q));
      }
      if (filters.extension) items = items.filter(f => f.extension === filters.extension);
      if (filters.dateFrom) items = items.filter(f => f.createdAt.slice(0, 10) >= filters.dateFrom!.slice(0, 10));
      if (filters.dateTo)   items = items.filter(f => f.createdAt.slice(0, 10) <= filters.dateTo!.slice(0, 10));

      const key = filters.sortBy ?? 'name';
      const dir = filters.sortDir === 'desc' ? -1 : 1;
      items = [...items].sort((a, b) => {
        const x = a[key];
        const y = b[key];
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return cmp * dir;
      });

      return paginate(items, filters.page, filters.pageSize);
    });
  }

  get(id: string): Observable<FileItem> {
    return respond(() => {
      this.db.assertAccess('file', id, 'read');
      return this.db.file(id);
    });
  }

  upload(file: File, folderId: string | null): Observable<FileItem> {
    return from(file.text()).pipe(
      delay(MOCK_DELAY),
      map(text => {
        const name = file.name.trim();
        const match = /\.(txt|md)$/i.exec(name);
        if (!match) fail(400, 'Solo se permiten archivos .txt y .md');

        let ownerId = this.db.me.id;
        if (folderId) {
          this.db.assertAccess('folder', folderId, 'edit');
          ownerId = this.db.folder(folderId).ownerId;
        }
        if (this.db.nameTaken('file', ownerId, folderId, name)) {
          fail(409, 'Ya existe un archivo con ese nombre en la carpeta');
        }

        const extension = match[1].toLowerCase() as FileExtension;
        const ts = now();
        const item: FileItem = {
          id: newId(), name, extension,
          mimeType: extension === 'md' ? 'text/markdown' : 'text/plain',
          size: file.size, ownerId, folderId,
          deleted: false, deletedAt: null, deletedRootId: null,
          createdAt: ts, updatedAt: ts
        };
        this.db.files.push(item);
        this.db.contents.set(item.id, text);
        this.db.adjustStorage(ownerId, item.size);
        this.db.log('upload', this.db.resRef('file', item));
        return item;
      })
    );
  }

  getContent(id: string): Observable<FileContent> {
    return respond(() => {
      this.db.assertAccess('file', id, 'read');
      this.db.file(id);
      return { fileId: id, content: this.db.contents.get(id) ?? '' };
    });
  }

  updateContent(id: string, req: UpdateFileContentRequest): Observable<FileItem> {
    return respond(() => {
      this.db.assertAccess('file', id, 'edit');
      const file = this.db.file(id);
      const newSize = new Blob([req.content]).size;

      this.db.adjustStorage(file.ownerId, newSize - file.size);
      this.db.contents.set(id, req.content);
      file.size = newSize;
      file.updatedAt = now();
      this.db.log('edit', this.db.resRef('file', file));
      return file;
    });
  }

  download(id: string): Observable<Blob> {
    return respond(() => {
      this.db.assertAccess('file', id, 'read');
      const file = this.db.file(id);
      this.db.log('download', this.db.resRef('file', file));
      return new Blob([this.db.contents.get(id) ?? ''], { type: file.mimeType });
    });
  }

  rename(id: string, req: RenameFileRequest): Observable<FileItem> {
    return respond(() => {
      this.db.assertAccess('file', id, 'edit');
      const file = this.db.file(id);
      const name = req.name.trim();
      if (!name) fail(400, 'El nombre es obligatorio');
      if (!name.toLowerCase().endsWith('.' + file.extension)) {
        fail(400, `El archivo debe conservar la extensión .${file.extension}`);
      }
      if (this.db.nameTaken('file', file.ownerId, file.folderId, name, id)) {
        fail(409, 'Ya existe un archivo con ese nombre en la carpeta');
      }
      const from = file.name;
      file.name = name;
      file.updatedAt = now();
      this.db.log('rename', this.db.resRef('file', file), { from, to: name });
      return file;
    });
  }

  move(id: string, req: MoveFileRequest): Observable<FileItem> {
    return respond(() => {
      this.db.assertAccess('file', id, 'edit');
      const file = this.db.file(id);

      if (req.newFolderId) {
        this.db.assertAccess('folder', req.newFolderId, 'edit');
        const target = this.db.folder(req.newFolderId);
        if (target.deleted) fail(400, 'La carpeta destino está en la papelera');
        if (target.ownerId !== file.ownerId) fail(400, 'Solo se puede mover dentro del mismo propietario');
      }
      if (this.db.nameTaken('file', file.ownerId, req.newFolderId, file.name, id)) {
        fail(409, 'Ya existe un archivo con ese nombre en el destino');
      }

      const from = file.folderId;
      file.folderId = req.newFolderId;
      file.updatedAt = now();
      this.db.log('move', this.db.resRef('file', file), { from, to: req.newFolderId });
      return file;
    });
  }

  remove(id: string): Observable<void> {
    return respond(() => {
      this.db.assertOwner('file', id);
      const file = this.db.file(id);
      file.deleted = true;
      file.deletedAt = now();
      file.deletedRootId = file.id;
      this.db.log('delete', this.db.resRef('file', file));
    });
  }
}