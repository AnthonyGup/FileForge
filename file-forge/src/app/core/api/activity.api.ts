import { Observable } from 'rxjs';
import { Activity, ActivityFilters, Page } from '@app/core/models';

export abstract class ActivityApi {
  abstract list(filters?: ActivityFilters): Observable<Page<Activity>>;
}