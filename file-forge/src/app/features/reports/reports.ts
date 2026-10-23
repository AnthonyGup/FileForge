import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, first, map, Observable, of, switchMap, tap } from 'rxjs';
import {
  ACTIVITY_LABELS, ActivityFilters, ApiError, FileExtension,
  PermissionLevel, ReportFilters, User,
} from '@app/core/models';
import { ActivityApi, ReportApi, UserApi } from '@app/core/api';
import { Auth } from '@app/core/services/auth';
import { Pagination } from '@app/shared/components/pagination/pagination';
import {
  ReportsFilterConfig, ReportsFilters, ReportsFilterValue,
} from './reports-filters/reports-filters';
import { ReportColumn, ReportRowVM, ReportsTable } from './reports-table/reports-table';

type ReportKind =
  | 'files-by-type'
  | 'files-by-date'
  | 'files-by-operations'
  | 'top-users-by-files'
  | 'users-by-shares'
  | 'files-by-shared-users'
  | 'shared-by-user'
  | 'received-by-user'
  | 'activity'
  | 'activity-by-action'
  | 'activity-by-period'
  | 'top-actions'
  | 'storage';

interface ReportTab {
  kind: ReportKind;
  label: string;
  group: string;
  config: ReportsFilterConfig;
  adminOnly?: boolean;
}

interface ReportGroup {
  label: string;
  tabs: ReportTab[];
}

interface FetchResult {
  rows: ReportRowVM[];
  columns: ReportColumn[];
  total?: number;
}

const cfg = (dates = false, limit = false, period = false, users = false): ReportsFilterConfig =>
  ({ dates, limit, period, users });

const BARS: ReportColumn = { field: 'percent', label: 'Distribución', type: 'bar' };

const GROUP_ORDER = ['Archivos', 'Usuarios', 'Compartidos', 'Actividad'];

const COLS: Record<ReportKind, ReportColumn[]> = {
  'files-by-type': [
    { field: 'label', label: 'Tipo', type: 'text' },
    { field: 'count', label: 'Archivos', type: 'count' },
    { field: 'size', label: 'Tamaño', type: 'size' },
    BARS,
  ],
  'files-by-date': [
    { field: 'label', label: 'Fecha', type: 'date' },
    { field: 'count', label: 'Archivos', type: 'count' },
    { field: 'size', label: 'Tamaño', type: 'size' },
    BARS,
  ],
  'files-by-operations': [
    { field: 'label', label: 'Archivo', type: 'text' },
    { field: 'count', label: 'Operaciones', type: 'count' },
    BARS,
  ],
  'top-users-by-files': [
    { field: 'label', label: 'Usuario', type: 'text' },
    { field: 'sublabel', label: 'Correo', type: 'text' },
    { field: 'count', label: 'Archivos', type: 'count' },
    { field: 'size', label: 'Tamaño', type: 'size' },
    BARS,
  ],
  'users-by-shares': [
    { field: 'label', label: 'Usuario', type: 'text' },
    { field: 'count', label: 'Recursos compartidos', type: 'count' },
    BARS,
  ],
  'files-by-shared-users': [
    { field: 'label', label: 'Archivo', type: 'text' },
    { field: 'count', label: 'Usuarios', type: 'count' },
    BARS,
  ],
  'shared-by-user': [
    { field: 'label', label: 'Recurso', type: 'text' },
    { field: 'sublabel', label: 'Tipo', type: 'text' },
    { field: 'owner', label: 'Compartido con', type: 'text' },
    { field: 'permission', label: 'Permiso', type: 'text' },
    { field: 'date', label: 'Fecha', type: 'date' },
  ],
  'received-by-user': [
    { field: 'label', label: 'Recurso', type: 'text' },
    { field: 'sublabel', label: 'Tipo', type: 'text' },
    { field: 'owner', label: 'Propietario', type: 'text' },
    { field: 'permission', label: 'Permiso', type: 'text' },
    { field: 'date', label: 'Fecha', type: 'date' },
  ],
  activity: [
    { field: 'label', label: 'Acción', type: 'text' },
    { field: 'sublabel', label: 'Recurso', type: 'text' },
    { field: 'owner', label: 'Usuario', type: 'text' },
    { field: 'date', label: 'Fecha', type: 'date' },
  ],
  'activity-by-action': [
    { field: 'label', label: 'Acción', type: 'text' },
    { field: 'count', label: 'Operaciones', type: 'count' },
    BARS,
  ],
  'activity-by-period': [
    { field: 'label', label: 'Período', type: 'text' },
    { field: 'count', label: 'Operaciones', type: 'count' },
    BARS,
  ],
  'top-actions': [
    { field: 'label', label: 'Acción', type: 'text' },
    { field: 'count', label: 'Operaciones', type: 'count' },
    { field: 'percent', label: '% del total', type: 'percent' },
    BARS,
  ],
  storage: [
    { field: 'label', label: 'Carpeta', type: 'text' },
    { field: 'count', label: 'Archivos', type: 'count' },
    { field: 'size', label: 'Tamaño', type: 'size' },
    BARS,
  ],
};

@Component({
  selector: 'app-reports',
  imports: [ReportsFilters, ReportsTable, Pagination],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  private readonly reportApi = inject(ReportApi);
  private readonly activityApi = inject(ActivityApi);
  private readonly userApi = inject(UserApi);
  private readonly auth = inject(Auth);

  protected readonly tabs: ReportTab[] = [
    { kind: 'files-by-type', label: 'Archivos por tipo', group: 'Archivos', config: cfg(true) },
    { kind: 'files-by-date', label: 'Archivos por fecha', group: 'Archivos', config: cfg(true) },
    { kind: 'files-by-operations', label: 'Operaciones por archivo', group: 'Archivos', config: cfg(true, true) },
    { kind: 'storage', label: 'Almacenamiento', group: 'Archivos', config: cfg(true) },
    { kind: 'top-users-by-files', label: 'Usuarios por archivos', group: 'Usuarios', config: cfg(true, true), adminOnly: true },
    { kind: 'users-by-shares', label: 'Usuarios por compartidos', group: 'Usuarios', config: cfg(true, true), adminOnly: true },
    { kind: 'files-by-shared-users', label: 'Archivos más compartidos', group: 'Compartidos', config: cfg(true, true) },
    { kind: 'shared-by-user', label: 'Compartidos por usuario', group: 'Compartidos', config: cfg(false, false, false, true) },
    { kind: 'received-by-user', label: 'Compartidos recibidos', group: 'Compartidos', config: cfg(false, false, false, true) },
    { kind: 'activity', label: 'Actividad', group: 'Actividad', config: cfg(true) },
    { kind: 'activity-by-action', label: 'Actividad por acción', group: 'Actividad', config: cfg(true) },
    { kind: 'activity-by-period', label: 'Actividad por período', group: 'Actividad', config: cfg(true, false, true) },
    { kind: 'top-actions', label: 'Acciones frecuentes', group: 'Actividad', config: cfg(true, true) },
  ];

  protected readonly groups = computed<ReportGroup[]>(() => {
    const visible = this.tabs.filter(t => !t.adminOnly || this.auth.isAdmin());
    return GROUP_ORDER
      .map(label => ({ label, tabs: visible.filter(t => t.group === label) }))
      .filter(group => group.tabs.length > 0);
  });

  protected readonly currentTab = computed(() =>
    this.tabs.find(t => t.kind === this.report())!);

  protected readonly report = signal<ReportKind>('files-by-type');
  private readonly applied = signal<ReportsFilterValue>({});

  protected readonly rows = signal<ReportRowVM[]>([]);
  protected readonly columns = signal<ReportColumn[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);

  protected readonly users = signal<User[]>([]);
  private readonly usersLoaded = signal(false);

  protected readonly pageSizeOptions = [5, 10, 20, 50];

  protected readonly actPage = signal(1);
  protected readonly actPageSize = signal(10);

  private readonly query = computed(() => ({
    kind: this.report(),
    filters: this.applied(),
    page: this.actPage(),
    pageSize: this.actPageSize(),
  }));

  constructor() {
    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ kind, filters, page, pageSize }) => {
          if (kind === 'activity') {
            const f: ActivityFilters = { dateFrom: filters.from, dateTo: filters.to, page, pageSize };
            return this.activityApi.list(f).pipe(
              map((res): FetchResult => ({
                total: res.total,
                columns: COLS.activity,
                rows: res.items.map(a => ({
                  key: a.id,
                  label: ACTIVITY_LABELS[a.action],
                  sublabel: a.resource?.name ?? '—',
                  owner: a.user.name,
                  date: a.createdAt,
                  count: 0,
                })),
              })),
            );
          }
          return this.fetch(kind, filters);
        }),
        catchError((e: ApiError) => {
          this.error.set(e.message);
          return of({ rows: [], columns: [] } as FetchResult);
        }),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.rows.set(result.rows);
        this.columns.set(result.columns);
        this.total.set(result.total ?? result.rows.length);
        this.loading.set(false);
      });
  }

  private fetch(kind: ReportKind, value: ReportsFilterValue): Observable<FetchResult> {
    const f: ReportFilters = { from: value.from, to: value.to };
    const limit = value.limit ?? 10;
    const columns = COLS[kind];
    const useSize = kind === 'files-by-type' || kind === 'files-by-date'
      || kind === 'top-users-by-files' || kind === 'storage';

    switch (kind) {
      case 'files-by-type':
        return this.reportApi.filesByType(f).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.type, label: this.typeLabel(r.type), count: r.count, size: r.totalSize })),
          columns, useSize)));
      case 'files-by-date':
        return this.reportApi.filesByDate(f).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.date, label: r.date, count: r.count, size: r.totalSize })),
          columns, useSize)));
      case 'files-by-operations':
        return this.reportApi.filesByOperations({ ...f, limit }).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.fileId, label: r.fileName, count: r.count })),
          columns)));
      case 'top-users-by-files':
        return this.reportApi.topUsersByFiles({ ...f, limit }).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.userId, label: r.name, sublabel: r.email, count: r.count, size: r.totalSize })),
          columns, useSize)));
      case 'users-by-shares':
        return this.reportApi.usersByShares({ ...f, limit }).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.userId, label: r.name, count: r.count })),
          columns)));
      case 'files-by-shared-users':
        return this.reportApi.filesBySharedUsers({ ...f, limit }).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.fileId, label: r.fileName, count: r.count })),
          columns)));
      case 'shared-by-user':
        return this.reportApi.sharedByUser(this.resolveUserId(value)).pipe(map(rs => this.result(
          rs.map(r => this.shareRow(r.resourceId, r.resourceType, r.resourceName, r.permission, r.sharedWithName, r.createdAt)),
          columns)));
      case 'received-by-user':
        return this.reportApi.receivedByUser(this.resolveUserId(value)).pipe(map(rs => this.result(
          rs.map(r => this.shareRow(r.resourceId, r.resourceType, r.resourceName, r.permission, r.sharedWithName, r.createdAt)),
          columns)));
      case 'activity-by-action':
        return this.reportApi.activityByAction(f).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.action, label: ACTIVITY_LABELS[r.action], count: r.count })),
          columns)));
      case 'activity-by-period':
        return this.reportApi.activityByPeriod({ ...f, period: value.period ?? 'day' }).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.period, label: r.period, count: r.count })),
          columns)));
      case 'top-actions':
        return this.reportApi.topActions({ ...f, limit }).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.action, label: ACTIVITY_LABELS[r.action], count: r.count, percent: r.percent })),
          columns)));
      case 'storage':
        return this.reportApi.storageUsage(f).pipe(map(rs => this.result(
          rs.map(r => ({ key: r.key, label: r.label, count: r.count, size: r.totalSize })),
          columns, useSize)));
      default:
        return of({ rows: [], columns });
    }
  }

  private result(rows: ReportRowVM[], columns: ReportColumn[], useSize = false): FetchResult {
    const total = rows.reduce((s, r) => s + (useSize ? (r.size ?? 0) : r.count), 0);
    return {
      columns,
      rows: rows.map(r => ({
        ...r,
        percent: total ? Math.round(((useSize ? (r.size ?? 0) : r.count) / total) * 100) : 0,
      })),
    };
  }

  private shareRow(
    resourceId: string, resourceType: string, resourceName: string | null,
    permission: PermissionLevel, sharedWithName: string, createdAt: string,
  ): ReportRowVM {
    return {
      key: resourceId,
      label: resourceName ?? 'Recurso eliminado',
      sublabel: resourceType === 'file' ? 'Archivo' : 'Carpeta',
      owner: sharedWithName,
      permission: this.permissionLabel(permission),
      date: createdAt,
      count: 0,
    };
  }

  private resolveUserId(value: ReportsFilterValue): string {
    return this.auth.isAdmin() ? value.userId ?? '' : this.auth.user()?.id ?? '';
  }

  protected setReport(kind: ReportKind): void {
    this.report.set(kind);
    if ((kind === 'shared-by-user' || kind === 'received-by-user')
      && this.auth.isAdmin() && !this.usersLoaded()) {
      this.usersLoaded.set(true);
      this.userApi.list().pipe(first()).subscribe({
        next: users => this.users.set(users),
        error: () => this.usersLoaded.set(false),
      });
    }
  }

  protected onFiltersApplied(value: ReportsFilterValue): void {
    this.actPage.set(1);
    this.applied.set(value);
  }

  protected onFiltersCleared(): void {
    this.actPage.set(1);
    this.applied.set({});
  }

  protected onPageChange(page: number): void {
    this.actPage.set(page);
  }

  protected onPageSizeChange(pageSize: number): void {
    this.actPageSize.set(pageSize);
    this.actPage.set(1);
  }

  protected typeLabel(type: FileExtension): string {
    return type === 'md' ? 'Markdown (.md)' : 'Texto (.txt)';
  }

  private permissionLabel(p: PermissionLevel): string {
    return p === 'read' ? 'Lectura' : p === 'comment' ? 'Comentar' : 'Edición';
  }
}
