import { Injectable } from '@angular/core';
import {
  Activity, ActivityAction, ActivityResource, Comment, FileItem, Folder,
  PermissionLevel, ResourceType, Share, User
} from '@app/core/models';
import { buildSeed, MockUser } from './mock-data';
import { fail, newId, now } from './mock-utils';

const RANK: Record<PermissionLevel, number> = { read: 1, comment: 2, edit: 3 };

@Injectable({ providedIn: 'root' })
export class MockDb {
  users: MockUser[];
  folders: Folder[];
  files: FileItem[];
  shares: Share[];
  comments: Comment[];
  activity: Activity[];
  contents: Map<string, string>;    // fileId -> texto (en el backend: GridFS)

  constructor() {
    const seed = buildSeed();
    this.users = seed.users;
    this.folders = seed.folders;
    this.files = seed.files;
    this.shares = seed.shares;
    this.comments = seed.comments;
    this.activity = seed.activity;
    this.contents = new Map(Object.entries(seed.contents));
  }

  // ---------- Sesión ----------
  /** Usuario actual, tomado del token guardado en localStorage ('mock-token-<id>'). */
  get me(): MockUser {
    const id = (localStorage.getItem('token') ?? '').replace('mock-token-', '');
    return this.users.find(u => u.id === id && u.active) ?? fail(401, 'No autenticado');
  }

  toUser(u: MockUser): User {
    const { password, ...user } = u;
    return user;
  }

  userName(id: string): string {
    return this.users.find(u => u.id === id)?.name ?? 'Desconocido';
  }

  // ---------- Búsquedas ----------
  folder(id: string): Folder {
    return this.folders.find(f => f.id === id) ?? fail(404, 'Carpeta no encontrada');
  }

  file(id: string): FileItem {
    return this.files.find(f => f.id === id) ?? fail(404, 'Archivo no encontrado');
  }

  resource(type: ResourceType, id: string): FileItem | Folder | undefined {
    return type === 'file'
      ? this.files.find(f => f.id === id)
      : this.folders.find(f => f.id === id);
  }

  descendants(folderId: string): Folder[] {
    return this.folders.filter(f => f.ancestors.includes(folderId));
  }

  // ---------- Permisos ----------
  /** 'owner', el mayor permiso recibido (directo o heredado de una carpeta) o null. */
  permissionOn(type: ResourceType, id: string, userId: string = this.me.id): 'owner' | PermissionLevel | null {
    let ownerId: string;
    let folderIds: string[] = [];

    if (type === 'file') {
      const f = this.files.find(x => x.id === id);
      if (!f) return null;
      ownerId = f.ownerId;
      const parent = f.folderId ? this.folders.find(x => x.id === f.folderId) : undefined;
      if (parent) folderIds = [parent.id, ...parent.ancestors];
    } else {
      const f = this.folders.find(x => x.id === id);
      if (!f) return null;
      ownerId = f.ownerId;
      folderIds = [...f.ancestors];
    }

    if (ownerId === userId) return 'owner';

    const levels = this.shares
      .filter(s => s.sharedWithId === userId && (
        (s.resourceType === type && s.resourceId === id) ||
        (s.resourceType === 'folder' && folderIds.includes(s.resourceId))))
      .map(s => s.permission);

    if (!levels.length) return null;
    return levels.reduce((a, b) => (RANK[a] >= RANK[b] ? a : b));
  }

  assertAccess(type: ResourceType, id: string, min: PermissionLevel): void {
    const res = this.resource(type, id);
    if (!res || res.deleted) fail(404, 'El recurso no existe');

    const p = this.permissionOn(type, id);
    if (p === null) fail(403, 'No tienes acceso a este recurso');
    if (p !== 'owner' && RANK[p] < RANK[min]) fail(403, 'No tienes permiso para esta operación');
  }

  assertOwner(type: ResourceType, id: string): void {
    if (this.permissionOn(type, id) !== 'owner') {
      fail(403, 'Solo el propietario puede realizar esta operación');
    }
  }

  // ---------- Reglas de consistencia ----------
  /** Equivale a los índices únicos parciales (ownerId, padre, name, deleted:false). */
  nameTaken(type: ResourceType, ownerId: string, parentId: string | null, name: string, excludeId?: string): boolean {
    return type === 'file'
      ? this.files.some(f => !f.deleted && f.id !== excludeId && f.ownerId === ownerId && f.folderId === parentId && f.name === name)
      : this.folders.some(f => !f.deleted && f.id !== excludeId && f.ownerId === ownerId && f.parentId === parentId && f.name === name);
  }

  /** Cambia el padre de una carpeta y recalcula `ancestors` de todo su subárbol. */
  reanchorFolder(folder: Folder, newParent: Folder | null): void {
    const subtree = this.descendants(folder.id);
    const newAncestors = newParent ? [...newParent.ancestors, newParent.id] : [];
    folder.parentId = newParent ? newParent.id : null;
    folder.ancestors = newAncestors;
    folder.updatedAt = now();
    for (const d of subtree) {
      const idx = d.ancestors.indexOf(folder.id);
      d.ancestors = [...newAncestors, folder.id, ...d.ancestors.slice(idx + 1)];
    }
  }

  adjustStorage(userId: string, delta: number): void {
    const u = this.users.find(x => x.id === userId);
    if (u) u.storageUsed = Math.max(0, u.storageUsed + delta);
  }

  // ---------- Historial ----------
  resRef(type: ResourceType, r: { id: string; name: string; ownerId: string }): ActivityResource {
    return { type, id: r.id, name: r.name, ownerId: r.ownerId };
  }

  log(
    action: ActivityAction,
    resource: ActivityResource | null,
    details?: Record<string, unknown>,
    user: MockUser = this.me
  ): void {
    this.activity.unshift({
      id: newId(),
      user: { id: user.id, name: user.name },
      action,
      resource,
      details,
      createdAt: now()
    });
  }
}