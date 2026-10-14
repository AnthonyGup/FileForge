export const USER_ROLES = ['admin', 'user'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PERMISSIONS = ['read', 'comment', 'edit'] as const;
export type PermissionLevel = (typeof PERMISSIONS)[number];

export const RESOURCE_TYPES = ['file', 'folder'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const FILE_EXTENSIONS = ['txt', 'md'] as const;
export type FileExtension = (typeof FILE_EXTENSIONS)[number];

export const ACTIVITY_ACTIONS = [
    'login',
    'upload',
    'download',
    'rename',
    'move',
    'edit',
    'delete',
    'restore',
    'delete_permanent',
    'create_folder',
    'share',
    'update_share',
    'revoke_share',
    'comment'
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];