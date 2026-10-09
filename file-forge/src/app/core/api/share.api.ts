import { Observable } from 'rxjs';
import { CreateShareRequest, ResourceType, Share, ShareView, UpdateShareRequest } from '@app/core/models';

export abstract class ShareApi {
  abstract create(req: CreateShareRequest): Observable<Share>;
  abstract update(id: string, req: UpdateShareRequest): Observable<Share>;
  abstract revoke(id: string): Observable<void>;
  abstract listByResource(type: ResourceType, id: string): Observable<ShareView[]>;
  abstract sharedByMe(): Observable<ShareView[]>;
  abstract sharedWithMe(): Observable<ShareView[]>;
}