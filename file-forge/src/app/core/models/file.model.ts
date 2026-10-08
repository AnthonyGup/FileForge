import { ISODateString } from './common.model';

export type FileExtension = 'txt' | 'md';

export interface FileItem {
  id: string;
  name: string; // incluye la extensión: "informe.md"
  extension: FileExtension;
  mimeType: string; // 'text/plain' | 'text/markdown'
  size: number; // bytes
  ownerId: string;
  folderId: string | null; // null = raíz
  contentId?: string; // referencia a GridFS (la usa el backend)
  deleted: boolean;
  deletedAt: ISODateString | null;
  deletedRootId: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface RenameFileRequest {
  name: string;
}

export interface MoveFileRequest {
  newFolderId: string | null;
}

export interface FileContent {
  fileId: string;
  content: string;
}

export interface UpdateFileContentRequest {
  content: string;
}

export interface FileFilters {
  folderId?: string | null;
  search?: string;
  extension?: FileExtension;
  dateFrom?: ISODateString;
  dateTo?: ISODateString;
  sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
