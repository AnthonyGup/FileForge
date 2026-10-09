import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse } from '@app/core/models';
import { AuthApi } from '../auth.api';
import { MockDb } from '../../mock/mock-db';
import { fail, now, respond } from '../../mock/mock-utils';

@Injectable()
export class MockAuthApi extends AuthApi {
  private readonly db = inject(MockDb);

  login(req: LoginRequest): Observable<LoginResponse> {
    return respond(() => {
      const user = this.db.users.find(
        u => u.email.toLowerCase() === req.email.trim().toLowerCase()
      );
      if (!user || user.password !== req.password) fail(401, 'Credenciales inválidas');
      if (!user.active) fail(403, 'Usuario inactivo');

      user.lastLoginAt = now();
      this.db.log('login', null, undefined, user);
      return { token: `mock-token-${user.id}`, user: this.db.toUser(user) };
    });
  }
}