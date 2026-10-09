import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse } from '@app/core/models';

export abstract class AuthApi {
  abstract login(req: LoginRequest): Observable<LoginResponse>;
}