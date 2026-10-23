import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { ApiError, BreadcrumbItem, Folder } from '@app/core/models';
import { FolderApi } from '@app/core/api';
import { Dialog } from '../dialog/dialog';
import { UiIcon } from '@app/shared/icons/ui-icon/ui-icon';

@Component({
  selector: 'app-move-dialog',
  imports: [Dialog, UiIcon],
  templateUrl: './move-dialog.html',
  styleUrl: './move-dialog.scss'
})
export class MoveDialog {
  private readonly folderApi = inject(FolderApi);

  readonly title = input('Mover');
  /** Nombre del elemento que se mueve (solo informativo). */
  readonly itemName = input.required<string>();
  /** Ubicación actual del elemento (null = raíz). Sirve de punto de partida. */
  readonly currentLocationId = input.required<string | null>();
  /** Carpeta que no debe ofrecerse como destino (al mover una carpeta, ella misma). */
  readonly excludeFolderId = input<string | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly selected = output<string | null>();
  readonly cancelled = output<void>();

  protected readonly location = linkedSignal<string | null>(() => this.currentLocationId());

  protected readonly folders = signal<Folder[]>([]);
  protected readonly breadcrumb = signal<BreadcrumbItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly isSameLocation = computed(() => this.location() === this.currentLocationId());

  constructor() {
    toObservable(this.location)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(null);
        }),
        switchMap(id =>
          forkJoin({
            folders: this.folderApi.list(id),
            breadcrumb: this.folderApi.breadcrumb(id)
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
        const excluded = this.excludeFolderId();
        this.folders.set((result?.folders ?? []).filter(f => f.id !== excluded));
        this.breadcrumb.set(result?.breadcrumb ?? []);
        this.loading.set(false);
      });
  }

  protected go(id: string | null): void {
    this.location.set(id);
  }
}