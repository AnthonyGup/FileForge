import { Observable } from 'rxjs';
import { ResourceType, TrashItem } from '@app/core/models';

export abstract class TrashApi {
  abstract list(): Observable<TrashItem[]>;
  abstract restore(type: ResourceType, id: string): Observable<void>;
  abstract deletePermanent(type: ResourceType, id: string): Observable<void>;
}