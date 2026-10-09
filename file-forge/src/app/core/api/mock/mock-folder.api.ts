import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BreadcrumbItem, CreateFolderRequest, Folder, MoveFolderRequest, RenameFolderRequest
} from '@app/core/models';
import { FolderApi } from '../folder.api';
import { MockDb } from '../../mock/mock-db';
import { fail, newId, now, respond } from '../../mock/mock-utils';

@Injectable()
export class MockFolderApi extends FolderApi {
  private readonly db = inject(MockDb);

  list(parentId: string | null): Observable<Folder[]> {
    return respond(() => {
      const me = this.db.me;
      let items: Folder[];
      if (parentId === null) {
        items = this.db.folders.filter(f => !f.deleted && f.parentId === null && f.ownerId === me.id);
      } else {
        this.db.assertAccess('folder', parentId, 'read');
        items = this.db.folders.filter(f => !f.deleted && f.parentId === parentId);
      }
      return items.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  get(id: string): Observable<Folder> {
    return respond(() => {
      this.db.assertAccess('folder', id, 'read');
      return this.db.folder(id);
    });
  }

  breadcrumb(id: string | null): Observable<BreadcrumbItem[]> {
    return respond(() => {
      const root: BreadcrumbItem = { id: null, name: 'Mis archivos' };
      if (id === null) return [root];
      this.db.assertAccess('folder', id, 'read');
      const folder = this.db.folder(id);
      return [
        root,
        ...folder.ancestors.map(a => ({ id: a, name: this.db.folder(a).name })),
        { id: folder.id, name: folder.name }
      ];
    });
  }

  create(req: CreateFolderRequest): Observable<Folder> {
    return respond(() => {
      const name = req.name.trim();
      if (!name) fail(400, 'El nombre es obligatorio');

      let parent: Folder | null = null;
      if (req.parentId) {
        this.db.assertAccess('folder', req.parentId, 'edit');
        parent = this.db.folder(req.parentId);
      }
      const ownerId = parent ? parent.ownerId : this.db.me.id;
      if (this.db.nameTaken('folder', ownerId, req.parentId, name)) {
        fail(409, 'Ya existe una carpeta con ese nombre');
      }

      const ts = now();
      const folder: Folder = {
        id: newId(), name, ownerId,
        parentId: parent ? parent.id : null,
        ancestors: parent ? [...parent.ancestors, parent.id] : [],
        deleted: false, deletedAt: null, deletedRootId: null,
        createdAt: ts, updatedAt: ts
      };
      this.db.folders.push(folder);
      this.db.log('create_folder', this.db.resRef('folder', folder));
      return folder;
    });
  }

  rename(id: string, req: RenameFolderRequest): Observable<Folder> {
    return respond(() => {
      this.db.assertAccess('folder', id, 'edit');
      const folder = this.db.folder(id);
      const name = req.name.trim();
      if (!name) fail(400, 'El nombre es obligatorio');
      if (this.db.nameTaken('folder', folder.ownerId, folder.parentId, name, id)) {
        fail(409, 'Ya existe una carpeta con ese nombre');
      }
      const from = folder.name;
      folder.name = name;
      folder.updatedAt = now();
      this.db.log('rename', this.db.resRef('folder', folder), { from, to: name });
      return folder;
    });
  }

  move(id: string, req: MoveFolderRequest): Observable<Folder> {
    return respond(() => {
      this.db.assertAccess('folder', id, 'edit');
      const folder = this.db.folder(id);

      let target: Folder | null = null;
      if (req.newParentId) {
        this.db.assertAccess('folder', req.newParentId, 'edit');
        target = this.db.folder(req.newParentId);
        if (target.deleted) fail(400, 'La carpeta destino está en la papelera');
        if (target.id === folder.id || target.ancestors.includes(folder.id)) {
          fail(409, 'No se puede mover una carpeta dentro de sí misma o de una subcarpeta');
        }
      }
      if (target && target.ownerId !== folder.ownerId) {
        fail(400, 'Solo se puede mover dentro del mismo propietario');
      }
      if (this.db.nameTaken('folder', folder.ownerId, target ? target.id : null, folder.name, id)) {
        fail(409, 'Ya existe una carpeta con ese nombre en el destino');
      }

      const from = folder.parentId;
      this.db.reanchorFolder(folder, target);
      this.db.log('move', this.db.resRef('folder', folder), { from, to: folder.parentId });
      return folder;
    });
  }

  remove(id: string): Observable<void> {
    return respond(() => {
      this.db.assertOwner('folder', id);
      const folder = this.db.folder(id);
      const ts = now();

      const folders = [folder, ...this.db.descendants(id)].filter(f => !f.deleted);
      const folderIds = new Set(folders.map(f => f.id));
      const files = this.db.files.filter(f => !f.deleted && f.folderId !== null && folderIds.has(f.folderId));

      for (const item of [...folders, ...files]) {
        item.deleted = true;
        item.deletedAt = ts;
        item.deletedRootId = id;
      }
      this.db.log('delete', this.db.resRef('folder', folder));
    });
  }
}