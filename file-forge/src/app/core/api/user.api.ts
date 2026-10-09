import { Observable } from 'rxjs';
import { CreateUserRequest, UpdateUserRequest, User } from '@app/core/models';

export abstract class UserApi {
  /** Solo administrador. */
  abstract list(): Observable<User[]>;
  /** Usuarios activos distintos del actual (para el diálogo de compartir). */
  abstract listForSharing(): Observable<User[]>;
  abstract create(req: CreateUserRequest): Observable<User>;
  abstract update(id: string, req: UpdateUserRequest): Observable<User>;
}