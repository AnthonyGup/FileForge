export type ISODateString = string;

export type ResourceType = 'file' | 'folder';

export type PermissionLevel = 'read' | 'comment' | 'edit';

// Copia embebida de un usuario (historial y comentarios)
export interface UserRef {
  id: string;
  name: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  status: number;
  message: string;
}