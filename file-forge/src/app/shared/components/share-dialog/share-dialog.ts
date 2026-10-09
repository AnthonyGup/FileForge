import { Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { ApiError, PermissionLevel, ResourceType, ShareView, User } from '@app/core/models';
import { ShareApi, UserApi } from '@app/core/api';
import { Toast } from '@app/core/services/toast';
import { Dialog } from '../dialog/dialog';

export const PERMISSIONS: PermissionLevel[] = ['read', 'comment', 'edit'];

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  read: 'Lectura',
  comment: 'Comentar',
  edit: 'Edición'
};

@Component({
  selector: 'app-share-dialog',
  imports: [Dialog],
  templateUrl: './share-dialog.html',
  styleUrl: './share-dialog.scss'
})
export class ShareDialog {
  private readonly shareApi = inject(ShareApi);
  private readonly userApi = inject(UserApi);
  private readonly toast = inject(Toast);

  readonly resourceType = input.required<ResourceType>();
  readonly resourceId = input.required<string>();
  readonly resourceName = input.required<string>();

  readonly cancelled = output<void>();

  protected readonly permissions = PERMISSIONS;
  protected readonly labels = PERMISSION_LABELS;

  protected readonly users = signal<User[]>([]);
  protected readonly shares = signal<ShareView[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly selectedUserId = signal('');
  protected readonly selectedPermission = signal<PermissionLevel>('read');
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly revokingId = signal<string | null>(null);

  private readonly refreshTick = signal(0);

  /** Usuarios que todavía no tienen acceso a este recurso. */
  protected readonly availableUsers = computed(() => {
    const shared = new Set(this.shares().map(s => s.sharedWithId));
    return this.users().filter(u => !shared.has(u.id));
  });

  constructor() {
    toObservable(computed(() => ({
      type: this.resourceType(),
      id: this.resourceId(),
      tick: this.refreshTick()
    })))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(null);
        }),
        switchMap(({ type, id }) =>
          forkJoin({
            users: this.userApi.listForSharing(),
            shares: this.shareApi.listByResource(type, id)
          }).pipe(
            catchError((e: ApiError) => {
              this.loadError.set(e.message);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.users.set(result?.users ?? []);
        this.shares.set(result?.shares ?? []);
        this.loading.set(false);
      });
  }

  protected onUserChange(value: string): void {
    this.selectedUserId.set(value);
  }

  protected onPermissionChange(value: string): void {
    this.selectedPermission.set(value as PermissionLevel);
  }

  protected share(): void {
    const userId = this.selectedUserId();
    if (!userId || this.busy()) return;

    this.busy.set(true);
    this.actionError.set(null);

    this.shareApi.create({
      resourceType: this.resourceType(),
      resourceId: this.resourceId(),
      sharedWithId: userId,
      permission: this.selectedPermission()
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.selectedUserId.set('');
        this.toast.success('Permiso concedido');
        this.refreshTick.update(v => v + 1);
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        this.actionError.set(e.message);
      }
    });
  }

  protected changePermission(share: ShareView, value: string): void {
    const permission = value as PermissionLevel;
    if (permission === share.permission || this.busy()) return;

    this.busy.set(true);
    this.actionError.set(null);

    this.shareApi.update(share.id, { permission }).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Permiso actualizado');
        this.refreshTick.update(v => v + 1);
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        this.actionError.set(e.message);
      }
    });
  }

  protected revoke(share: ShareView): void {
    if (this.busy()) return;

    this.busy.set(true);
    this.revokingId.set(share.id);
    this.actionError.set(null);

    this.shareApi.revoke(share.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.revokingId.set(null);
        this.toast.success('Permiso retirado');
        this.refreshTick.update(v => v + 1);
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        this.revokingId.set(null);
        this.actionError.set(e.message);
      }
    });
  }
}
