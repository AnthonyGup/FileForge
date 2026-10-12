import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityAction, ActivityReportRow, FileExtension, FileTypeReportRow, ReportFilters, StorageReportRow } from '@app/core/models';
import { ReportApi } from '../report.api';
import { MockDb } from '../../mock/mock-db';
import { respond } from '../../mock/mock-utils';

@Injectable()
export class MockReportApi extends ReportApi {
  private readonly db = inject(MockDb);

  filesByType(filters: ReportFilters = {}): Observable<FileTypeReportRow[]> {
    return respond(() => {
      const me = this.db.me;
      // Admin reporta sobre todo el sistema; un usuario, sobre sus propios archivos.
      let files = this.db.files.filter(f =>
        !f.deleted && (me.role === 'admin' || f.ownerId === me.id));

      if (filters.from) files = files.filter(f => f.createdAt.slice(0, 10) >= filters.from!.slice(0, 10));
      if (filters.to)   files = files.filter(f => f.createdAt.slice(0, 10) <= filters.to!.slice(0, 10));

      const byType = new Map<FileExtension, FileTypeReportRow>();
      for (const f of files) {
        const row = byType.get(f.extension) ?? { type: f.extension, count: 0, totalSize: 0 };
        row.count += 1;
        row.totalSize += f.size;
        byType.set(f.extension, row);
      }

      return [...byType.values()].sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
    });
  }

  activityByAction(filters: ReportFilters = {}): Observable<ActivityReportRow[]> {
    return respond(() => {
      const me = this.db.me;
      // Mismo alcance que el historial: admin ve todo; usuario, lo suyo y lo de sus recursos.
      let items = this.db.activity.filter(a =>
        me.role === 'admin' || a.user.id === me.id || a.resource?.ownerId === me.id);

      if (filters.from) items = items.filter(a => a.createdAt.slice(0, 10) >= filters.from!.slice(0, 10));
      if (filters.to)   items = items.filter(a => a.createdAt.slice(0, 10) <= filters.to!.slice(0, 10));

      const byAction = new Map<ActivityAction, ActivityReportRow>();
      for (const a of items) {
        const row = byAction.get(a.action) ?? { action: a.action, count: 0 };
        row.count += 1;
        byAction.set(a.action, row);
      }

      return [...byAction.values()].sort((a, b) => b.count - a.count || a.action.localeCompare(b.action));
    });
  }

  storageUsage(filters: ReportFilters = {}): Observable<StorageReportRow[]> {
    return respond(() => {
      const me = this.db.me;
      // Admin: almacenamiento por usuario en todo el sistema; usuario: por carpeta de sus archivos.
      let files = this.db.files.filter(f =>
        !f.deleted && (me.role === 'admin' || f.ownerId === me.id));

      if (filters.from) files = files.filter(f => f.createdAt.slice(0, 10) >= filters.from!.slice(0, 10));
      if (filters.to)   files = files.filter(f => f.createdAt.slice(0, 10) <= filters.to!.slice(0, 10));

      const byGroup = new Map<string, StorageReportRow>();
      for (const f of files) {
        const key = me.role === 'admin' ? f.ownerId : (f.folderId ?? 'root');
        const label = me.role === 'admin'
          ? this.db.userName(f.ownerId)
          : (f.folderId ? this.db.folders.find(x => x.id === f.folderId)?.name ?? 'Carpeta' : 'Sin carpeta');
        const row = byGroup.get(key) ?? { key, label, count: 0, totalSize: 0 };
        row.count += 1;
        row.totalSize += f.size;
        byGroup.set(key, row);
      }

      return [...byGroup.values()].sort((a, b) => b.totalSize - a.totalSize || a.label.localeCompare(b.label));
    });
  }
}
