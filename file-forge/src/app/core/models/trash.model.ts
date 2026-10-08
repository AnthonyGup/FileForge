import { ISODateString, ResourceType } from './common.model';

export interface TrashItem {
  id: string;
  type: ResourceType;
  name: string;
  size?: number; // solo archivos
  deletedAt: ISODateString;
}
