import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import {
  ACTIVITY_LABELS, ActivityReportRow, ApiError, FileExtension, FileTypeReportRow, ReportFilters, StorageReportRow,
} from '@app/core/models';
import { ReportApi } from '@app/core/api';
import { Auth } from '@app/core/services/auth';
import { FileSizePipe } from '@app/shared/pipes/file-size-pipe';

type ReportKind = 'files-by-type' | 'activity-by-action' | 'storage';

interface ReportTab {
  kind: ReportKind;
  label: string;
  category: string; // título de la primera columna
}

interface ReportRowVM {
  key: string;
  label: string;
  count: number;
  size: number | null;
}

interface Loaded {
  kind: ReportKind;
  rows: FileTypeReportRow[] | ActivityReportRow[] | StorageReportRow[];
}

@Component({
  selector: 'app-reports',
  imports: [FileSizePipe],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  private readonly reportApi = inject(ReportApi);
  private readonly auth = inject(Auth);

  protected readonly tabs: ReportTab[] = [
    { kind: 'files-by-type', label: 'Archivos por tipo', category: 'Tipo' },
    { kind: 'activity-by-action', label: 'Actividad por acción', category: 'Acción' },
    { kind: 'storage', label: 'Almacenamiento', category: 'Carpeta' },
  ];

  protected readonly report = signal<ReportKind>('files-by-type');

  private readonly filesRows = signal<FileTypeReportRow[]>([]);
  private readonly activityRows = signal<ActivityReportRow[]>([]);
  private readonly storageRows = signal<StorageReportRow[]>([]);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly dateError = signal<string | null>(null);

  private readonly applied = signal<ReportFilters>({});
  private readonly query = computed(() => ({ kind: this.report(), filters: this.applied() }));

  protected readonly activeTab = computed<ReportTab>(() => {
    const tab = this.tabs.find(t => t.kind === this.report())!;
    return this.report() === 'storage'
      ? { ...tab, category: this.auth.isAdmin() ? 'Usuario' : 'Carpeta' }
      : tab;
  });
  protected readonly showSize = computed(() => this.report() !== 'activity-by-action');

  protected readonly rows = computed<ReportRowVM[]>(() => {
    switch (this.report()) {
      case 'files-by-type':
        return this.filesRows().map(r => ({ key: r.type, label: this.typeLabel(r.type), count: r.count, size: r.totalSize }));
      case 'storage':
        return this.storageRows().map(r => ({ key: r.key, label: r.label, count: r.count, size: r.totalSize }));
      default:
        return this.activityRows().map(r => ({ key: r.action, label: ACTIVITY_LABELS[r.action], count: r.count, size: null }));
    }
  });

  protected readonly totalRows = computed(() => this.rows().reduce((s, r) => s + r.count, 0));
  protected readonly rowSizeTotal = computed(() => this.rows().reduce((s, r) => s + (r.size ?? 0), 0));
  private readonly isSizeMetric = computed(() => this.report() === 'storage');
  protected readonly maxMetric = computed(() =>
    Math.max(1, ...this.rows().map(r => this.metric(r))));
  private readonly metricTotal = computed(() => this.rows().reduce((s, r) => s + this.metric(r), 0));
  protected readonly empty = computed(() => !this.loading() && !this.error() && this.rows().length === 0);
  protected readonly hasFilters = computed(() => !!(this.from() || this.to()));

  constructor() {
    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ kind, filters }) => {
          const request$: Observable<Loaded> =
            kind === 'files-by-type' ? this.reportApi.filesByType(filters).pipe(map(rows => ({ kind, rows }) as Loaded))
            : kind === 'activity-by-action' ? this.reportApi.activityByAction(filters).pipe(map(rows => ({ kind, rows }) as Loaded))
            : this.reportApi.storageUsage(filters).pipe(map(rows => ({ kind, rows }) as Loaded));
          return request$.pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of({ kind, rows: [] } as Loaded);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(({ kind, rows }) => {
        if (kind === 'files-by-type') this.filesRows.set(rows as FileTypeReportRow[]);
        else if (kind === 'activity-by-action') this.activityRows.set(rows as ActivityReportRow[]);
        else this.storageRows.set(rows as StorageReportRow[]);
        this.loading.set(false);
      });
  }

  protected setReport(kind: ReportKind): void {
    this.report.set(kind);
  }

  protected onFromChange(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  protected onToChange(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  protected applyFilters(): void {
    const from = this.from();
    const to = this.to();
    if (from && to && from > to) {
      this.dateError.set('El rango de fechas es inválido');
      return;
    }
    this.dateError.set(null);
    this.applied.set({ from: from || undefined, to: to || undefined });
  }

  protected clearFilters(): void {
    this.from.set('');
    this.to.set('');
    this.dateError.set(null);
    this.applied.set({});
  }

  protected typeLabel(type: FileExtension): string {
    return type === 'md' ? 'Markdown (.md)' : 'Texto (.txt)';
  }

  // La pestaña de almacenamiento mide bytes; las demás, cantidad de elementos.
  private metric(row: ReportRowVM): number {
    return this.isSizeMetric() ? (row.size ?? 0) : row.count;
  }

  protected percent(row: ReportRowVM): number {
    const total = this.metricTotal();
    return total ? Math.round((this.metric(row) / total) * 100) : 0;
  }

  protected barWidth(row: ReportRowVM): string {
    return `${Math.round((this.metric(row) / this.maxMetric()) * 100)}%`;
  }
}
