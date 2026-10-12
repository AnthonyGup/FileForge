import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ApiError, User, UserRole } from '@app/core/models';
import { UserApi } from '@app/core/api';
import { Auth } from '@app/core/services/auth';
import { Toast } from '@app/core/services/toast';
import { FileSizePipe } from '@app/shared/pipes/file-size-pipe';

@Component({
  selector: 'app-admin',
  imports: [DatePipe, FileSizePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  private readonly userApi = inject(UserApi);
  private readonly auth = inject(Auth);
  private readonly toast = inject(Toast);

  protected readonly meId = computed(() => this.auth.user()?.id ?? null);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  protected readonly newName = signal('');
  protected readonly newEmail = signal('');
  protected readonly newPassword = signal('');
  protected readonly newRole = signal<UserRole>('user');
  protected readonly creating = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly totalUsers = computed(() => this.users().length);
  protected readonly activeUsers = computed(() => this.users().filter(u => u.active).length);
  protected readonly adminCount = computed(() => this.users().filter(u => u.role === 'admin').length);
  protected readonly totalStorage = computed(() => this.users().reduce((sum, u) => sum + u.storageUsed, 0));
  protected readonly empty = computed(() => !this.loading() && !this.error() && this.users().length === 0);

  private readonly refreshTick = signal(0);

  constructor() {
    toObservable(this.refreshTick)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.userApi.list().pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.users.set(result ?? []);
        this.loading.set(false);
      });
  }

  protected reload(): void {
    this.refreshTick.update(v => v + 1);
  }

  protected onName(event: Event): void {
    this.newName.set((event.target as HTMLInputElement).value);
  }

  protected onEmail(event: Event): void {
    this.newEmail.set((event.target as HTMLInputElement).value);
  }

  protected onPassword(event: Event): void {
    this.newPassword.set((event.target as HTMLInputElement).value);
  }

  protected onNewRole(event: Event): void {
    this.newRole.set((event.target as HTMLSelectElement).value as UserRole);
  }

  protected create(): void {
    const name = this.newName().trim();
    const email = this.newEmail().trim();
    const password = this.newPassword();
    if (!name || !email || !password) {
      this.formError.set('Completa todos los campos');
      return;
    }

    this.creating.set(true);
    this.formError.set(null);
    this.userApi.create({ name, email, password, role: this.newRole() }).subscribe({
      next: () => {
        this.creating.set(false);
        this.newName.set('');
        this.newEmail.set('');
        this.newPassword.set('');
        this.newRole.set('user');
        this.toast.success('Usuario creado');
        this.reload();
      },
      error: (e: ApiError) => {
        this.creating.set(false);
        this.formError.set(e.message);
      }
    });
  }

  protected changeRole(user: User, role: string): void {
    if (role === user.role) return;
    this.busyId.set(user.id);
    this.userApi.update(user.id, { role: role as UserRole }).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success('Rol actualizado');
        this.reload();
      },
      error: (e: ApiError) => {
        this.busyId.set(null);
        this.toast.error(e.message);
      }
    });
  }

  protected toggleActive(user: User): void {
    this.busyId.set(user.id);
    this.userApi.update(user.id, { active: !user.active }).subscribe({
      next: (updated: User) => {
        this.busyId.set(null);
        this.toast.success(updated.active ? 'Usuario activado' : 'Usuario desactivado');
        this.reload();
      },
      error: (e: ApiError) => {
        this.busyId.set(null);
        this.toast.error(e.message);
      }
    });
  }

  protected roleLabel(role: UserRole): string {
    return role === 'admin' ? 'Administrador' : 'Usuario';
  }
}
