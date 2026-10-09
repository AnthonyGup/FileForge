import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceType, TrashItem } from '@app/core/models';
import { TrashApi } from '../trash.api';
import { MockDb } from '../../mock/mock-db';
import { fail, now, respond } from '../../mock/mock-utils';

@Injectable()
export class MockTrashApi extends TrashApi {
  private readonly db = inject(MockDb);

  private assertInTrash(item: { id: string; deleted: boolean; deletedRootId: string | null }): void {
    if (!item.deleted || item.deletedRootId !== item.id) fail(400, 'El elemento no está en la papelera');
  }

  list(): Observable<TrashItem[]> {
    return respond(() => {
      const me = this.db.me.id;
      const folders = this.db.folders
        .filter(f => f.ownerId === me && f.deleted && f.deletedRootId === f.id)
        .map((f): TrashItem => ({ id: f.id, type: 'folder', name: f.name, deletedAt: f.deletedAt ?? f.updatedAt }));
      const files = this.db.files
        .filter(f => f.ownerId === me && f.deleted && f.deletedRootId === f.id)
        .map((f): TrashItem => ({ id: f.id, type: 'file', name: f.name, size: f.size, deletedAt: f.deletedAt ?? f.updatedAt }));
      return [...folders, ...files].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    });
  }

  restore(type: ResourceType, id: string): Observable<void> {
    return respond(() => {
      this.db.assertOwner(type, id);

      if (type === 'file') {
        const file = this.db.file(id);
        this.assertInTrash(file);
        const parent = file.folderId ? this.db.folders.find(f => f.id === file.folderId) : undefined;
        if (!parent || parent.deleted) file.folderId = null;           // el padre ya no existe: va a la raíz
        if (this.db.nameTaken('file', file.ownerId, file.folderId, file.name, file.id)) {
          file.name = file.name.replace(/(\.[^.]+)$/, ' (restaurado)$1');
        }
        this.db.log('restore', this.db.resRef('file', file));
      } else {
        const folder = this.db.folder(id);
        this.assertInTrash(folder);
        const parent = folder.parentId ? this.db.folders.find(f => f.id === folder.parentId) : undefined;
        this.db.reanchorFolder(folder, parent && !parent.deleted ? parent : null);
        if (this.db.nameTaken('folder', folder.ownerId, folder.parentId, folder.name, folder.id)) {
          folder.name = `${folder.name} (restaurado)`;
        }
        this.db.log('restore', this.db.resRef('folder', folder));
      }

      // Restaura todo lo que se eliminó junto con este elemento
      const ts = now();
      for (const item of [
        ...this.db.folders.filter(f => f.deletedRootId === id),
        ...this.db.files.filter(f => f.deletedRootId === id)
      ]) {
        item.deleted = false;
        item.deletedAt = null;
        item.deletedRootId = null;
        item.updatedAt = ts;
      }
    });
  }

  deletePermanent(type: ResourceType, id: string): Observable<void> {
    return respond(() => {
      this.db.assertOwner(type, id);
      const root = this.db.resource(type, id) ?? fail(404, 'Recurso no encontrado');
      this.assertInTrash(root);

      const folders = this.db.folders.filter(f => f.deletedRootId === id);
      const files = this.db.files.filter(f => f.deletedRootId === id);

      this.db.log('delete_permanent', this.db.resRef(type, root));   // el historial se conserva

      for (const f of files) {
        this.db.contents.delete(f.id);                                // en el backend: GridFS delete
        this.db.adjustStorage(f.ownerId, -f.size);
      }
      const ids = new Set([...folders.map(f => f.id), ...files.map(f => f.id)]);
      this.db.files = this.db.files.filter(f => !ids.has(f.id));
      this.db.folders = this.db.folders.filter(f => !ids.has(f.id));
      this.db.shares = this.db.shares.filter(s => !ids.has(s.resourceId));
      this.db.comments = this.db.comments.filter(c => !ids.has(c.fileId));
    });
  }
}