import { ISODateString } from './common.model';

export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  parentId: string | null; // null = raíz del usuario
  ancestors: string[]; // ids desde la raíz hasta el padre
  deleted: boolean;
  deletedAt: ISODateString | null;
  deletedRootId: string | null; // elemento que se eliminó directamente
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateFolderRequest {
  name: string;
  parentId: string | null;
}

export interface RenameFolderRequest {
  name: string;
}

export interface MoveFolderRequest {
  newParentId: string | null;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}
