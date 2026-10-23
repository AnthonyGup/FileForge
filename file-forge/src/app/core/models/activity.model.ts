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
  | 'comment'
  | 'update_comment'
  | 'delete_comment';

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

// Etiquetas legibles de las acciones (compartidas por la vista de actividad y los reportes).
export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  login: 'Inicio de sesión',
  upload: 'Subida',
  download: 'Descarga',
  rename: 'Renombrado',
  move: 'Movimiento',
  edit: 'Edición',
  delete: 'Envío a papelera',
  restore: 'Restauración',
  delete_permanent: 'Eliminación definitiva',
  create_folder: 'Carpeta creada',
  share: 'Compartido',
  update_share: 'Permiso actualizado',
  revoke_share: 'Acceso retirado',
  comment: 'Comentario',
  update_comment: 'Comentario editado',
  delete_comment: 'Comentario eliminado'
};
