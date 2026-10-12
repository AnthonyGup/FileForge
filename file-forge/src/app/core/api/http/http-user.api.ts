import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateUserRequest, UpdateUserRequest, User } from '@app/core/models';
import { UserApi } from '../user.api';
import { API_URL } from './http-utils';

@Injectable()
export class HttpUserApi extends UserApi {
  private readonly http = inject(HttpClient);

  list(): Observable<User[]> {
    return this.http.get<User[]>(`${API_URL}/users`);
  }

  listForSharing(): Observable<User[]> {
    return this.http.get<User[]>(`${API_URL}/users/sharing`);
  }

  create(req: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${API_URL}/users`, req);
  }

  update(id: string, req: UpdateUserRequest): Observable<User> {
    return this.http.patch<User>(`${API_URL}/users/${id}`, req);
  }
}
