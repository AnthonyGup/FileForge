import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, Observable, of, switchMap, tap } from 'rxjs';
import { ApiError, TrashItem } from '@app/core/models';
import { TrashApi } from '@app/core/api';
import { Toast } from '@app/core/services/toast';
import { ConfirmDialog } from '@app/shared/components/confirm-dialog/confirm-dialog';
import { FileSizePipe } from '@app/shared/pipes/file-size-pipe';

@Component({
  selector: 'app-trash',
  imports: [DatePipe, FileSizePipe, ConfirmDialog],
  templateUrl: './trash.html',
  styleUrl: './trash.scss',
})
export class Trash {
  private readonly trashApi = inject(TrashApi);
  private readonly toast = inject(Toast);

  protected readonly items = signal<TrashItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly restoringId = signal<string | null>(null);

  protected readonly deleting = signal<TrashItem | null>(null);
  protected readonly busy = signal(false);
  protected readonly dialogError = signal<string | null>(null);

  protected readonly empty = computed(() => !this.loading() && !this.error() && this.items().length === 0);

  private readonly refreshTick = signal(0);

  constructor() {
    toObservable(this.refreshTick)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.trashApi.list().pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.items.set(result ?? []);
        this.loading.set(false);
      });
  }

  protected reload(): void {
    this.refreshTick.update(v => v + 1);
  }

  protected icon(item: TrashItem): string {
    return item.type === 'folder' ? '📁' : '📄';
  }

  protected restore(item: TrashItem): void {
    if (this.restoringId()) return;
    this.restoringId.set(item.id);
    this.trashApi.restore(item.type, item.id).subscribe({
      next: () => {
        this.restoringId.set(null);
        this.toast.success(item.type === 'folder' ? 'Carpeta restaurada' : 'Archivo restaurado');
        this.reload();
      },
      error: (e: ApiError) => {
        this.restoringId.set(null);
        this.toast.error(e.message);
      }
    });
  }

  protected askDelete(item: TrashItem): void {
    this.dialogError.set(null);
    this.deleting.set(item);
  }

  protected closeDialog(): void {
    this.deleting.set(null);
    this.dialogError.set(null);
    this.busy.set(false);
  }

  protected confirmDelete(): void {
    const item = this.deleting();
    if (!item) return;
    this.run(this.trashApi.deletePermanent(item.type, item.id));
  }

  private run(request$: Observable<unknown>): void {
    this.busy.set(true);
    this.dialogError.set(null);

    request$.subscribe({
      next: () => {
        this.closeDialog();
        this.toast.success('Elemento eliminado definitivamente');
        this.reload();
      },
      error: (e: ApiError) => {
        this.dialogError.set(e.message);
        this.busy.set(false);
      }
    });
  }
}
