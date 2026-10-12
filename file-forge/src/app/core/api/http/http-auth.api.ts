import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse } from '@app/core/models';
import { AuthApi } from '../auth.api';
import { API_URL } from './http-utils';

@Injectable()
export class HttpAuthApi extends AuthApi {
  private readonly http = inject(HttpClient);

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, req);
  }
}
