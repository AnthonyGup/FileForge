import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest } from '@app/core/models';

export abstract class AuthApi {
  abstract login(req: LoginRequest): Observable<LoginResponse>;
  abstract register(req: RegisterRequest): Observable<LoginResponse>;
}