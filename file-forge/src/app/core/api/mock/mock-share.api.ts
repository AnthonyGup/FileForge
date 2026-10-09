import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateShareRequest, ResourceType, Share, ShareView, UpdateShareRequest
} from '@app/core/models';
import { ShareApi } from '../share.api';
import { MockDb } from '../../mock/mock-db';
import { fail, newId, now, respond } from '../../mock/mock-utils';

@Injectable()
export class MockShareApi extends ShareApi {
  private readonly db = inject(MockDb);

  private toView(s: Share): ShareView {
    const res = this.db.resource(s.resourceType, s.resourceId);
    return {
      ...s,
      resourceName: res ? res.name : '(eliminado)',
      ownerName: this.db.userName(s.ownerId),
      sharedWithName: this.db.userName(s.sharedWithId)
    };
  }

  private isLive(s: Share): boolean {
    const res = this.db.resource(s.resourceType, s.resourceId);
    return !!res && !res.deleted;
  }

  create(req: CreateShareRequest): Observable<Share> {
    return respond(() => {
      const me = this.db.me;
      this.db.assertOwner(req.resourceType, req.resourceId);
      if (req.sharedWithId === me.id) fail(400, 'No puedes compartir un recurso contigo mismo');

      const target = this.db.users.find(u => u.id === req.sharedWithId);
      if (!target || !target.active) fail(404, 'El usuario destino no es válido');

      const res = this.db.resource(req.resourceType, req.resourceId) ?? fail(404, 'Recurso no encontrado');
      const ref = this.db.resRef(req.resourceType, res);
      const ts = now();

      const existing = this.db.shares.find(s =>
        s.resourceType === req.resourceType &&
        s.resourceId === req.resourceId &&
        s.sharedWithId === req.sharedWithId);

      if (existing) {
        existing.permission = req.permission;
        existing.updatedAt = ts;
        this.db.log('update_share', ref, { sharedWith: target.name, permission: req.permission });
        return existing;
      }

      const share: Share = {
        id: newId(),
        resourceType: req.resourceType,
        resourceId: req.resourceId,
        ownerId: me.id,
        sharedWithId: req.sharedWithId,
        permission: req.permission,
        createdAt: ts, updatedAt: ts
      };
      this.db.shares.push(share);
      this.db.log('share', ref, { sharedWith: target.name, permission: req.permission });
      return share;
    });
  }

  update(id: string, req: UpdateShareRequest): Observable<Share> {
    return respond(() => {
      const me = this.db.me;
      const share = this.db.shares.find(s => s.id === id) ?? fail(404, 'Permiso no encontrado');
      if (share.ownerId !== me.id) fail(403, 'Solo el propietario puede modificar el permiso');
      share.permission = req.permission;
      share.updatedAt = now();
      const res = this.db.resource(share.resourceType, share.resourceId);
      if (res) {
        this.db.log('update_share', this.db.resRef(share.resourceType, res), {
          sharedWith: this.db.userName(share.sharedWithId), permission: req.permission
        });
      }
      return share;
    });
  }

  revoke(id: string): Observable<void> {
    return respond(() => {
      const me = this.db.me;
      const share = this.db.shares.find(s => s.id === id) ?? fail(404, 'Permiso no encontrado');
      if (share.ownerId !== me.id) fail(403, 'Solo el propietario puede retirar el permiso');
      this.db.shares = this.db.shares.filter(s => s.id !== id);
      const res = this.db.resource(share.resourceType, share.resourceId);
      if (res) {
        this.db.log('revoke_share', this.db.resRef(share.resourceType, res), {
          sharedWith: this.db.userName(share.sharedWithId)
        });
      }
    });
  }

  listByResource(type: ResourceType, id: string): Observable<ShareView[]> {
    return respond(() => {
      this.db.assertOwner(type, id);
      return this.db.shares
        .filter(s => s.resourceType === type && s.resourceId === id)
        .map(s => this.toView(s));
    });
  }

  sharedByMe(): Observable<ShareView[]> {
    return respond(() => {
      const me = this.db.me;
      return this.db.shares
        .filter(s => s.ownerId === me.id && this.isLive(s))
        .map(s => this.toView(s));
    });
  }

  sharedWithMe(): Observable<ShareView[]> {
    return respond(() => {
      const me = this.db.me;
      return this.db.shares
        .filter(s => s.sharedWithId === me.id && this.isLive(s))
        .map(s => this.toView(s));
    });
  }
}