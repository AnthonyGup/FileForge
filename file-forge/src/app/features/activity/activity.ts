import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ApiError, ACTIVITY_LABELS, Activity as ActivityModel, ActivityAction, ActivityFilters, Page } from '@app/core/models';
import { ActivityApi } from '@app/core/api';
import { Pagination } from '@app/shared/components/pagination/pagination';

@Component({
  selector: 'app-activity',
  imports: [DatePipe, RouterLink, Pagination],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class Activity {
  private readonly activityApi = inject(ActivityApi);

  protected readonly items = signal<ActivityModel[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filters = signal<ActivityFilters>({
    action: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    page: 1,
    pageSize: 10,
  });

  protected readonly pageSizeOptions = [5, 10, 20, 50];

  private readonly refreshTick = signal(0);

  protected readonly empty = computed(() => !this.loading() && !this.error() && this.items().length === 0);
  protected readonly page = computed(() => this.filters().page ?? 1);
  protected readonly pageSize = computed(() => this.filters().pageSize ?? 10);
  protected readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return Boolean(f.action || f.dateFrom || f.dateTo);
  });

  constructor() {
    toObservable(computed(() => ({ filters: this.filters(), tick: this.refreshTick() })))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ filters }) =>
          this.activityApi.list(filters).pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of({ items: [], total: 0, page: filters.page ?? 1, pageSize: filters.pageSize ?? 10 } as Page<ActivityModel>);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }

  protected reload(): void {
    this.refreshTick.update(v => v + 1);
  }

  protected onActionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ActivityAction | '';
    this.filters.update(f => ({ ...f, action: value || undefined, page: 1 }));
  }

  protected onDateFromChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filters.update(f => ({ ...f, dateFrom: value || undefined, page: 1 }));
  }

  protected onDateToChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filters.update(f => ({ ...f, dateTo: value || undefined, page: 1 }));
  }

  protected clearFilters(): void {
    this.filters.set({
      action: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
      pageSize: this.filters().pageSize,
    });
  }

  protected onPageChange(page: number): void {
    this.filters.update(f => ({ ...f, page }));
  }

  protected onPageSizeChange(pageSize: number): void {
    this.filters.update(f => ({ ...f, pageSize, page: 1 }));
  }

  protected actionIcon(action: ActivityAction): string {
    const icons: Record<ActivityAction, string> = {
      login: '🔐',
      upload: '⬆',
      download: '⬇',
      rename: '✏️',
      move: '📦',
      edit: '📝',
      delete: '🗑️',
      restore: '♻️',
      delete_permanent: '❌',
      create_folder: '📁',
      share: '👥',
      update_share: '🔁',
      revoke_share: '🚫',
      comment: '💬',
    };
    return icons[action] || '📌';
  }

  protected actionLabel(action: ActivityAction): string {
    return ACTIVITY_LABELS[action] || action;
  }

  protected resourceLink(activity: ActivityModel): string[] | null {
    if (!activity.resource) return null;
    return activity.resource.type === 'folder'
      ? ['/explorer', activity.resource.id]
      : ['/file', activity.resource.id];
  }

  protected detailsText(activity: ActivityModel): string | null {
    const d = activity.details;
    if (!d) return null;

    switch (activity.action) {
      case 'rename':
        return `de "${d['from']}" a "${d['to']}"`;
      case 'move':
        return `de carpeta ${d['from']} a ${d['to']}`;
      case 'share':
        return `con ${d['sharedWith']} (${this.permissionLabel(d['permission'] as string)})`;
      case 'update_share':
        return `${d['sharedWith']} → ${this.permissionLabel(d['permission'] as string)}`;
      case 'revoke_share':
        return `para ${d['sharedWith']}`;
      default:
        return JSON.stringify(d);
    }
  }

  private permissionLabel(p: string): string {
    return p === 'read' ? 'Lectura' : p === 'comment' ? 'Comentar' : p === 'edit' ? 'Edición' : p;
  }
}