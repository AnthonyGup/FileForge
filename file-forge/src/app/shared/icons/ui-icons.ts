export type UiIconName =
  | 'folder'
  | 'file'
  | 'doc'
  | 'share'
  | 'rename'
  | 'move'
  | 'delete'
  | 'download'
  | 'upload'
  | 'edit'
  | 'search'
  | 'menu'
  | 'close'
  | 'restore'
  | 'deletePermanent'
  | 'activity'
  | 'reports'
  | 'admin'
  | 'login'
  | 'comment'
  | 'updateShare'
  | 'revokeShare'
  | 'open'
  | 'back'
  | 'link'
  | 'sortAsc'
  | 'sortDesc'
  | 'loading';

export const UI_PATHS: Record<UiIconName, string[]> = {
  folder: [
    'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'
  ],
  file: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4'
  ],
  doc: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
    'M16 13H8',
    'M16 17H8',
    'M10 9H8'
  ],
  share: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75'
  ],
  rename: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'],
  move: [
    'M6 4h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2',
    'M2 13h10',
    'm9 16 3-3-3-3'
  ],
  delete: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'M10 11v6',
    'M14 11v6'
  ],
  download: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'M7 10l5 5 5-5',
    'M12 15V3'
  ],
  upload: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'M17 8l-5-5-5 5',
    'M12 3v12'
  ],
  edit: [
    'M12 20h9',
    'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'
  ],
  search: [
    'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z',
    'M21 21l-4.3-4.3'
  ],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  restore: [
    'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8',
    'M3 3v5h5'
  ],
  deletePermanent: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'M9.5 11.5 14.5 16.5',
    'M14.5 11.5 9.5 16.5'
  ],
  activity: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    'M12 7v5l3 2'
  ],
  reports: [
    'M3 3v18h18',
    'M18 17V9',
    'M13 17V5',
    'M8 17v-3'
  ],
  admin: [
    'M21 4h-7',
    'M10 4H3',
    'M21 12h-9',
    'M8 12H3',
    'M21 20h-5',
    'M12 20H3',
    'M14 2v4',
    'M8 10v4',
    'M16 18v4'
  ],
  login: [
    'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4',
    'M10 17l5-5-5-5',
    'M15 12H3'
  ],
  comment: [
    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z'
  ],
  updateShare: [
    'M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8',
    'M3 3v5h5',
    'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16',
    'M16 16h5v5'
  ],
  revokeShare: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    'm5.6 5.6 12.8 12.8'
  ],
  open: [
    'm15 14 5-5-5-5',
    'M4 20v-7a4 4 0 0 1 4-4h12'
  ],
  back: ['M19 12H5', 'm12 19-7-7 7-7'],
  link: ['M7 7h10v10', 'M7 17 17 7'],
  sortAsc: ['m6 15 6-6 6 6'],
  sortDesc: ['m6 9 6 6 6-6'],
  loading: [
    'M12 2v4',
    'M12 18v4',
    'M4.9 4.9l2.8 2.8',
    'M16.3 16.3l2.8 2.8',
    'M2 12h4',
    'M18 12h4',
    'M4.9 19.1l2.8-2.8',
    'M16.3 7.7l2.8-2.8'
  ]
};

export function fileIcon(extension?: string | null): UiIconName {
  return extension === 'md' ? 'doc' : 'file';
}

export function resourceIcon(type: 'folder' | 'file'): UiIconName {
  return type === 'folder' ? 'folder' : 'file';
}
