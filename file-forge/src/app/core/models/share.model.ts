import { ISODateString, PermissionLevel, ResourceType } from './common.model';

export interface Share {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  ownerId: string;
  sharedWithId: string;
  permission: PermissionLevel;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateShareRequest {
  resourceType: ResourceType;
  resourceId: string;
  sharedWithId: string;
  permission: PermissionLevel;
}

export interface UpdateShareRequest {
  permission: PermissionLevel;
}

// Vista enriquecida (resultado de $lookup) para "Compartidos por mí / conmigo"
export interface ShareView extends Share {
  resourceName: string;
  ownerName: string;
  sharedWithName: string;
}
