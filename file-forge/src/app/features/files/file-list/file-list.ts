import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { ApiError, FileFilters, FileItem } from '@app/core/models';
import { FileApi } from '@app/core/api';
import { Auth } from '@app/core/services/auth';
import { FileTransfer, UploadResult } from '@app/core/services/file-transfer';
import { Toast } from '@app/core/services/toast';
import { ConfirmDialog } from '@app/shared/components/confirm-dialog/confirm-dialog';
import { MoveDialog } from '@app/shared/components/move-dialog/move-dialog';
import { Pagination } from '@app/shared/components/pagination/pagination';
import { FileSizePipe } from '@app/shared/pipes/file-size-pipe';
import { FileRenameDialog } from '../file-rename-dialog/file-rename-dialog';
import { DEFAULT_FILTERS, FileFilterBar, FileFilterState } from '../file-filter-bar/file-filter-bar';

type SortField = NonNullable<FileFilters['sortBy']>;
type SortDir = NonNullable<FileFilters['sortDir']>;

@Component({
  selector: 'app-file-list',
  imports: [DatePipe, UpperCasePipe, RouterLink, Pagination, FileSizePipe, ConfirmDialog, MoveDialog, FileRenameDialog, FileFilterBar],
  templateUrl: './file-list.html',
  styleUrl: './file-list.scss'
})
export class FileList {
  private readonly fileApi = inject(FileApi);
  private readonly transfer = inject(FileTransfer);
  private readonly toast = inject(Toast);
  private readonly auth = inject(Auth);

  /** null = raíz del usuario. */
  readonly folderId = input<string | null>(null);
  /** Muestra las opciones de subida (el servidor valida el permiso real). */
  readonly canUpload = input(false);

  protected readonly meId = computed(() => this.auth.user()?.id ?? null);

  // ---------- Filtros, orden y paginación ----------
  protected readonly filters = signal<FileFilterState>(DEFAULT_FILTERS);
  protected readonly sortBy = signal<SortField>('name');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly pageSize = signal(10);
  /** Vuelve a la página 1 cuando cambia la carpeta o los filtros. */
  protected readonly page = linkedSignal({
    source: () => ({ folder: this.folderId(), filters: this.filters() }),
    computation: () => 1
  });

  protected readonly filterBar = viewChild(FileFilterBar);

  protected readonly scopeAll = computed(() => this.filters().scope === 'all');
  /** Subir archivos solo tiene sentido al trabajar sobre la carpeta actual. */
  protected readonly canUploadNow = computed(() => this.canUpload() && !this.scopeAll());
  protected readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return !!(f.search || f.extension || f.dateFrom || f.dateTo);
  });

  // ---------- Datos ----------
  protected readonly files = signal<FileItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  // ---------- Transferencias ----------
  protected readonly progress = signal<{ done: number; total: number } | null>(null);
  protected readonly uploading = computed(() => this.progress() !== null);
  protected readonly dragActive = signal(false);
  protected readonly downloadingId = signal<string | null>(null);

  // ---------- Diálogos ----------
  protected readonly renaming = signal<FileItem | null>(null);
  protected readonly moving = signal<FileItem | null>(null);
  protected readonly deleting = signal<FileItem | null>(null);
  protected readonly busy = signal(false);
  protected readonly dialogError = signal<string | null>(null);

  private readonly refreshTick = signal(0);

  private readonly query = computed(() => {
    const f = this.filters();
    return {
      folderId: f.scope === 'all' ? undefined : this.folderId(),
      search: f.search || undefined,
      extension: f.extension || undefined,
      dateFrom: f.dateFrom || undefined,
      dateTo: f.dateTo || undefined,
      sortBy: this.sortBy(),
      sortDir: this.sortDir(),
      page: this.page(),
      pageSize: this.pageSize(),
      tick: this.refreshTick()
    };
  });

  constructor() {
    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ tick: _tick, ...filters }) =>
          this.fileApi.list(filters).pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        if (!result) {
          this.files.set([]);
          this.total.set(0);
          this.loading.set(false);
          return;
        }

        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (result.total > 0 && result.page > lastPage) {
          this.page.set(lastPage);
          return;
        }

        this.files.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }

  reload(): void {
    this.refreshTick.update(v => v + 1);
  }

  // ---------- Orden y paginación ----------
  protected toggleSort(field: SortField): void {
    if (this.sortBy() === field) {
      this.sortDir.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortDir.set('asc');
    }
    this.page.set(1);
  }

  protected changePageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  protected onFiltersChanged(filters: FileFilterState): void {
    this.filters.set(filters);
  }

  protected clearFilters(): void {
    this.filterBar()?.clear();
  }

  /** Enlace a la carpeta que contiene el archivo (modo "todos"). */
  protected locationLink(file: FileItem): string[] {
    return file.folderId ? ['/explorer', file.folderId] : ['/explorer'];
  }

  protected canOpenLocation(file: FileItem): boolean {
    return file.folderId !== null || file.ownerId === this.meId();
  }

  protected sortIndicator(field: SortField): string {
    if (this.sortBy() !== field) return '';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  protected ariaSort(field: SortField): 'ascending' | 'descending' | 'none' {
    if (this.sortBy() !== field) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected icon(file: FileItem): string {
    return file.extension === 'md' ? '📝' : '📄';
  }

  // ---------- Subida ----------
  protected onPick(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.upload(files);
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.canUploadNow()) return;
    event.preventDefault();
    this.dragActive.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    const host = event.currentTarget as HTMLElement;
    if (!host.contains(event.relatedTarget as Node | null)) {
      this.dragActive.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    if (!this.canUploadNow()) return;
    event.preventDefault();
    this.dragActive.set(false);
    this.upload(Array.from(event.dataTransfer?.files ?? []));
  }

  private upload(files: File[]): void {
    if (files.length === 0 || this.uploading()) return;

    const results: UploadResult[] = [];
    this.progress.set({ done: 0, total: files.length });

    this.transfer.uploadMany(files, this.folderId()).subscribe({
      next: result => {
        results.push(result);
        this.progress.set({ done: results.length, total: files.length });
      },
      complete: () => {
        this.progress.set(null);
        this.report(results);
        this.reload();
      }
    });
  }

  private report(results: UploadResult[]): void {
    const okCount = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok);

    if (okCount > 0) {
      this.toast.success(okCount === 1 ? 'Archivo subido' : `${okCount} archivos subidos`);
    }
    failed.slice(0, 3).forEach(r => this.toast.error(`${r.name}: ${r.error}`));
    if (failed.length > 3) {
      this.toast.error(`...y ${failed.length - 3} errores más`);
    }
  }

  // ---------- Descarga ----------
  protected download(file: FileItem): void {
    if (this.downloadingId()) return;
    this.downloadingId.set(file.id);

    this.transfer.download(file).subscribe({
      next: () => this.downloadingId.set(null),
      error: (e: ApiError) => {
        this.downloadingId.set(null);
        this.toast.error(e.message);
      }
    });
  }

  // ---------- Renombrar / mover / eliminar ----------
  protected openRename(file: FileItem): void { this.closeDialogs(); this.renaming.set(file); }
  protected openMove(file: FileItem): void { this.closeDialogs(); this.moving.set(file); }
  protected openDelete(file: FileItem): void { this.closeDialogs(); this.deleting.set(file); }

  protected closeDialogs(): void {
    this.renaming.set(null);
    this.moving.set(null);
    this.deleting.set(null);
    this.busy.set(false);
    this.dialogError.set(null);
  }

  protected submitRename(name: string): void {
    const file = this.renaming();
    if (!file) return;
    if (name === file.name) {
      this.closeDialogs();
      return;
    }
    this.run(this.fileApi.rename(file.id, { name }), 'Archivo renombrado');
  }

  protected submitMove(newFolderId: string | null): void {
    const file = this.moving();
    if (!file) return;
    this.run(this.fileApi.move(file.id, { newFolderId }), 'Archivo movido');
  }

  protected confirmDelete(): void {
    const file = this.deleting();
    if (!file) return;
    this.run(this.fileApi.remove(file.id), 'Archivo enviado a la papelera');
  }

  /** Ejecuta una operación; si falla el diálogo permanece abierto mostrando el error. */
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