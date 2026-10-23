import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ApiError, ShareView } from '@app/core/models';
import { ShareApi } from '@app/core/api';
import { PERMISSION_LABELS, ShareDialog } from '@app/shared/components/share-dialog/share-dialog';
import { resourceIcon, UiIconName } from '@app/shared/icons/ui-icons';
import { UiIcon } from '@app/shared/icons/ui-icon/ui-icon';

export type ShareMode = 'by-me' | 'with-me';

@Component({
  selector: 'app-share-list',
  imports: [DatePipe, RouterLink, ShareDialog, UiIcon],
  templateUrl: './share-list.html',
  styleUrl: './share-list.scss'
})
export class ShareList {
  private readonly shareApi = inject(ShareApi);

  readonly mode = input.required<ShareMode>();

  protected readonly labels = PERMISSION_LABELS;

  protected readonly shares = signal<ShareView[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly managing = signal<ShareView | null>(null);

  private readonly refreshTick = signal(0);

  protected readonly title = computed(() =>
    this.mode() === 'by-me' ? 'Compartidos por mí' : 'Compartidos conmigo');
  protected readonly subtitle = computed(() =>
    this.mode() === 'by-me'
      ? 'Recursos que pusiste a disposición de otras personas.'
      : 'Recursos que otras personas compartieron contigo.');

  constructor() {
    toObservable(computed(() => ({ mode: this.mode(), tick: this.refreshTick() })))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ mode }) =>
          (mode === 'by-me' ? this.shareApi.sharedByMe() : this.shareApi.sharedWithMe()).pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.shares.set(result ?? []);
        this.loading.set(false);
      });
  }

  protected reload(): void {
    this.refreshTick.update(v => v + 1);
  }

  protected icon(share: ShareView): UiIconName {
    return resourceIcon(share.resourceType);
  }

  protected link(share: ShareView): string[] {
    return share.resourceType === 'folder'
      ? ['/explorer', share.resourceId]
      : ['/file', share.resourceId];
  }

  protected openManage(share: ShareView): void {
    this.managing.set(share);
  }

  protected closeManage(): void {
    this.managing.set(null);
    this.reload();
  }
}
