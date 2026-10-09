import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateUserRequest, UpdateUserRequest, User } from '@app/core/models';
import { UserApi } from '../user.api';
import { MockDb } from '../../mock/mock-db';
import { fail, newId, now, respond } from '../../mock/mock-utils';

@Injectable()
export class MockUserApi extends UserApi {
  private readonly db = inject(MockDb);

  private assertAdmin(): void {
    if (this.db.me.role !== 'admin') fail(403, 'Solo el administrador puede realizar esta operación');
  }

  list(): Observable<User[]> {
    return respond(() => {
      this.assertAdmin();
      return this.db.users.map(u => this.db.toUser(u));
    });
  }

  listForSharing(): Observable<User[]> {
    return respond(() => {
      const me = this.db.me;
      return this.db.users
        .filter(u => u.active && u.id !== me.id)
        .map(u => this.db.toUser(u));
    });
  }

  create(req: CreateUserRequest): Observable<User> {
    return respond(() => {
      this.assertAdmin();
      const email = req.email.trim().toLowerCase();
      if (this.db.users.some(u => u.email.toLowerCase() === email)) fail(409, 'El email ya está registrado');
      const ts = now();
      const user = {
        id: newId(), name: req.name.trim(), email, password: req.password,
        role: req.role, active: true, storageUsed: 0,
        createdAt: ts, updatedAt: ts, lastLoginAt: null
      };
      this.db.users.push(user);
      return this.db.toUser(user);
    });
  }

  update(id: string, req: UpdateUserRequest): Observable<User> {
    return respond(() => {
      this.assertAdmin();
      const me = this.db.me;
      const user = this.db.users.find(u => u.id === id) ?? fail(404, 'Usuario no encontrado');
      if (id === me.id && req.active === false) fail(400, 'No puedes desactivarte a ti mismo');
      if (req.name !== undefined) user.name = req.name.trim();
      if (req.role !== undefined) user.role = req.role;
      if (req.active !== undefined) user.active = req.active;
      user.updatedAt = now();
      return this.db.toUser(user);
    });
  }
}