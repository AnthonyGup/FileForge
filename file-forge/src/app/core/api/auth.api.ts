import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest, UpdateProfileRequest, User } from '@app/core/models';

export abstract class AuthApi {
  abstract login(req: LoginRequest): Observable<LoginResponse>;
  abstract register(req: RegisterRequest): Observable<LoginResponse>;
  abstract updateProfile(req: UpdateProfileRequest): Observable<User>;
}