import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Activity, ActivityFilters, Page } from '@app/core/models';
import { ActivityApi } from '../activity.api';
import { MockDb } from '../../mock/mock-db';
import { paginate, respond } from '../../mock/mock-utils';

@Injectable()
export class MockActivityApi extends ActivityApi {
  private readonly db = inject(MockDb);

  list(filters: ActivityFilters = {}): Observable<Page<Activity>> {
    return respond(() => {
      const me = this.db.me;
      // Admin ve todo; usuario ve lo suyo y lo ocurrido sobre sus recursos
      let items = this.db.activity.filter(a =>
        me.role === 'admin' || a.user.id === me.id || a.resource?.ownerId === me.id);

      if (filters.userId)     items = items.filter(a => a.user.id === filters.userId);
      if (filters.action)     items = items.filter(a => a.action === filters.action);
      if (filters.resourceId) items = items.filter(a => a.resource?.id === filters.resourceId);
      if (filters.dateFrom)   items = items.filter(a => a.createdAt.slice(0, 10) >= filters.dateFrom!.slice(0, 10));
      if (filters.dateTo)     items = items.filter(a => a.createdAt.slice(0, 10) <= filters.dateTo!.slice(0, 10));

      return paginate(items, filters.page, filters.pageSize ?? 20);   // ya viene de más reciente a más antiguo
    });
  }
}