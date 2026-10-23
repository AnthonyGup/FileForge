import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest, UpdateProfileRequest, User } from '@app/core/models';
import { AuthApi } from '../auth.api';
import { API_URL } from './http-utils';

@Injectable()
export class HttpAuthApi extends AuthApi {
  private readonly http = inject(HttpClient);

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, req);
  }

  register(req: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/register`, req);
  }

  updateProfile(req: UpdateProfileRequest): Observable<User> {
    return this.http.patch<User>(`${API_URL}/auth/me`, req);
  }
}
