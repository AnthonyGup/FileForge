import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { ApiError, BreadcrumbItem, Folder } from '@app/core/models';
import { FolderApi } from '@app/core/api';
import { Auth } from '@app/core/services/auth';
import { Toast } from '@app/core/services/toast';
import { Breadcrumbs } from '@app/shared/components/breadcrumbs/breadcrumbs';
import { ConfirmDialog } from '@app/shared/components/confirm-dialog/confirm-dialog';
import { MoveDialog } from '@app/shared/components/move-dialog/move-dialog';
import { ShareDialog } from '@app/shared/components/share-dialog/share-dialog';
import { FileList } from '@app/features/files/file-list/file-list';
import { FolderNameDialog } from './folder-name-dialog/folder-name-dialog';

const ROOT: BreadcrumbItem = { id: null, name: 'Mis archivos' };

@Component({
  selector: 'app-explorer',
  imports: [DatePipe, RouterLink, Breadcrumbs, ConfirmDialog, FolderNameDialog, MoveDialog, ShareDialog, FileList],
  templateUrl: './explorer.html',
  styleUrl: './explorer.scss'
})
export class Explorer {
  private readonly folderApi = inject(FolderApi);
  private readonly auth = inject(Auth);
  private readonly toast = inject(Toast);

  readonly folderId = input<string>();

  // ---------- Estado de la vista ----------
  protected readonly folders = signal<Folder[]>([]);
  protected readonly currentFolder = signal<Folder | null>(null);
  protected readonly breadcrumb = signal<BreadcrumbItem[]>([ROOT]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly refreshTick = signal(0);
  protected readonly currentId = computed(() => this.folderId() ?? null);
  protected readonly meId = computed(() => this.auth.user()?.id ?? null);

  protected readonly canManageCurrent = computed(() => {
    const current = this.currentFolder();
    return !current || current.ownerId === this.meId();
  });

  protected readonly parentLink = computed<string[] | null>(() => {
    const crumbs = this.breadcrumb();
    if (crumbs.length < 2) return null;
    const parent = crumbs[crumbs.length - 2];
    return parent.id ? ['/explorer', parent.id] : ['/explorer'];
  });

  protected readonly creating = signal(false);
  protected readonly renaming = signal<Folder | null>(null);
  protected readonly moving = signal<Folder | null>(null);
  protected readonly deleting = signal<Folder | null>(null);
  protected readonly sharing = signal<Folder | null>(null);
  protected readonly busy = signal(false);
  protected readonly dialogError = signal<string | null>(null);

  constructor() {
    toObservable(computed(() => ({ id: this.currentId(), tick: this.refreshTick() })))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ id }) =>
          forkJoin({
            folders: this.folderApi.list(id),
            breadcrumb: this.folderApi.breadcrumb(id),
            current: id ? this.folderApi.get(id) : of(null)
          }).pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.folders.set(result?.folders ?? []);
        this.breadcrumb.set(result?.breadcrumb ?? [ROOT]);
        this.currentFolder.set(result?.current ?? null);
        this.loading.set(false);
      });
  }

  protected reload(): void {
    this.refreshTick.update(v => v + 1);
  }

  protected openCreate(): void { this.closeDialogs(); this.creating.set(true); }
  protected openRename(folder: Folder): void { this.closeDialogs(); this.renaming.set(folder); }
  protected openMove(folder: Folder): void { this.closeDialogs(); this.moving.set(folder); }
  protected openDelete(folder: Folder): void { this.closeDialogs(); this.deleting.set(folder); }
  protected openShare(folder: Folder): void { this.closeDialogs(); this.sharing.set(folder); }

  protected closeDialogs(): void {
    this.creating.set(false);
    this.renaming.set(null);
    this.moving.set(null);
    this.deleting.set(null);
    this.sharing.set(null);
    this.busy.set(false);
    this.dialogError.set(null);
  }

  protected submitCreate(name: string): void {
    this.run(this.folderApi.create({ name, parentId: this.currentId() }), 'Carpeta creada');
  }

  protected submitRename(name: string): void {
    const folder = this.renaming();
    if (!folder) return;
    if (name === folder.name) {
      this.closeDialogs();
      return;
    }
    this.run(this.folderApi.rename(folder.id, { name }), 'Carpeta renombrada');
  }

  protected submitMove(newParentId: string | null): void {
    const folder = this.moving();
    if (!folder) return;
    this.run(this.folderApi.move(folder.id, { newParentId }), 'Carpeta movida');
  }

  protected confirmDelete(): void {
    const folder = this.deleting();
    if (!folder) return;
    this.run(this.folderApi.remove(folder.id), 'Carpeta enviada a la papelera');
  }

  private run(request$: Observable<unknown>, successMessage: string): void {
    this.busy.set(true);
    this.dialogError.set(null);

    request$.subscribe({
      next: () => {
        this.closeDialogs();
        this.toast.success(successMessage);
        this.reload();
      },
      error: (e: ApiError) => {
        this.dialogError.set(e.message);
        this.busy.set(false);
      }
    });
  }
}