import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoginRequest, LoginResponse, RegisterRequest, UpdateProfileRequest, User } from '@app/core/models';
import { AuthApi } from '@app/core/api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly _user = signal<User | null>(this.readStoredUser());

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._token() !== null && this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  login(req: LoginRequest): Observable<User> {
    return this.api.login(req).pipe(map(res => this.store(res)));
  }

  register(req: RegisterRequest): Observable<User> {
    return this.api.register(req).pipe(map(res => this.store(res)));
  }

  updateProfile(req: UpdateProfileRequest): Observable<User> {
    return this.api.updateProfile(req).pipe(map(user => this.storeUser(user)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  private store(res: LoginResponse): User {
    localStorage.setItem(TOKEN_KEY, res.token);
    this._token.set(res.token);
    return this.storeUser(res.user);
  }

  private storeUser(user: User): User {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
    return user;
  }

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}