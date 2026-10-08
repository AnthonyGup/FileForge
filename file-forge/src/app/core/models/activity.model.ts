import { ISODateString, ResourceType, UserRef } from './common.model';

export type ActivityAction =
  | 'login'
  | 'upload'
  | 'download'
  | 'rename'
  | 'move'
  | 'edit'
  | 'delete'
  | 'restore'
  | 'delete_permanent'
  | 'create_folder'
  | 'share'
  | 'update_share'
  | 'revoke_share'
  | 'comment';

// Copia embebida del recurso al momento de la acción
export interface ActivityResource {
  type: ResourceType;
  id: string;
  name: string;
  ownerId: string;
}

export interface Activity {
  id: string;
  user: UserRef; // embebido (histórico)
  action: ActivityAction;
  resource: ActivityResource | null; // null en acciones como 'login'
  details?: Record<string, unknown>; // ej. { from, to, permission }
  createdAt: ISODateString;
}

export interface ActivityFilters {
  userId?: string;
  action?: ActivityAction;
  resourceId?: string;
  dateFrom?: ISODateString;
  dateTo?: ISODateString;
  page?: number;
  pageSize?: number;
}
