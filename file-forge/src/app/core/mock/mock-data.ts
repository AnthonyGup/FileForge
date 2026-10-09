import { Activity, Comment, FileItem, Folder, Share, User } from '@app/core/models';

export interface MockUser extends User {
  password: string;
}

export interface MockSeed {
  users: MockUser[];
  folders: Folder[];
  files: FileItem[];
  shares: Share[];
  comments: Comment[];
  activity: Activity[];
  contents: Record<string, string>;   // fileId -> texto
}

const iso = (daysAgo: number): string =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

function mkFolder(
  id: string, name: string, ownerId: string, parentId: string | null,
  ancestors: string[], daysAgo: number, trashRoot: string | null = null
): Folder {
  return {
    id, name, ownerId, parentId, ancestors,
    deleted: trashRoot !== null,
    deletedAt: trashRoot ? iso(1) : null,
    deletedRootId: trashRoot,
    createdAt: iso(daysAgo),
    updatedAt: iso(daysAgo)
  };
}

type FileSpec = [string, string, string, string | null, string, number, string?];

export function buildSeed(): MockSeed {
  const users: MockUser[] = [
    { id: 'u1', name: 'Admin Sistema', email: 'admin@demo.com', password: '123456', role: 'admin', active: true, storageUsed: 0, createdAt: iso(60), updatedAt: iso(60), lastLoginAt: null },
    { id: 'u2', name: 'Ana López',     email: 'ana@demo.com',   password: '123456', role: 'user',  active: true, storageUsed: 0, createdAt: iso(50), updatedAt: iso(50), lastLoginAt: null },
    { id: 'u3', name: 'Luis Pérez',    email: 'luis@demo.com',  password: '123456', role: 'user',  active: true, storageUsed: 0, createdAt: iso(45), updatedAt: iso(45), lastLoginAt: null }
  ];

  const folders: Folder[] = [
    mkFolder('f1', 'Contratos', 'u2', null, [], 30),
    mkFolder('f2', '2026',      'u2', 'f1', ['f1'], 28),
    mkFolder('f3', 'Informes',  'u2', null, [], 25),
    mkFolder('f4', 'Proyectos', 'u3', null, [], 20),
    mkFolder('f5', 'Docs',      'u3', 'f4', ['f4'], 18),
    mkFolder('f6', 'Borrador',  'u2', null, [], 10, 'f6')      // en papelera
  ];

  const extraReports: FileSpec[] = Array.from({ length: 12 }, (_, i): FileSpec => [
    `r${i + 1}`,
    `reporte-${String(i + 1).padStart(2, '0')}.txt`,
    'u2',
    'f3',
    'Contenido de prueba. '.repeat((i + 1) * 15),
    i + 1
  ]);

  const specs: FileSpec[] = [
    ['a1', 'contrato-acme.md', 'u2', 'f2', '# Contrato ACME\n\nVigencia: 12 meses.', 27],
    ['a2', 'notas.txt',        'u2', null, 'Notas generales de la semana.', 15],
    ['a3', 'informe-q1.md',    'u2', 'f3', '# Informe Q1\n\nResultados del primer trimestre.', 24],
    ['a4', 'informe-q2.txt',   'u2', 'f3', 'Informe del segundo trimestre.', 12],
    ['a5', 'borrador.txt',     'u2', 'f6', 'Texto en borrador.', 9, 'f6'],   // borrado con su carpeta
    ['a6', 'viejo.txt',        'u2', null, 'Archivo antiguo.', 40, 'a6'],    // en papelera
    ['b1', 'plan.md',          'u3', 'f5', '# Plan de proyecto\n\n- Fase 1\n- Fase 2', 17],
    ['b2', 'readme.md',        'u3', 'f4', '# Proyecto\n\nDescripción general.', 19],
    ['b3', 'ideas.txt',        'u3', null, 'Lista de ideas.', 8],
    ...extraReports
  ];

  const contents: Record<string, string> = {};
  const files: FileItem[] = specs.map(([id, name, ownerId, folderId, content, daysAgo, trashRoot]) => {
    const extension = name.toLowerCase().endsWith('.md') ? 'md' : 'txt';
    contents[id] = content;
    return {
      id, name, extension,
      mimeType: extension === 'md' ? 'text/markdown' : 'text/plain',
      size: new Blob([content]).size,
      ownerId, folderId,
      deleted: !!trashRoot,
      deletedAt: trashRoot ? iso(1) : null,
      deletedRootId: trashRoot ?? null,
      createdAt: iso(daysAgo),
      updatedAt: iso(daysAgo)
    } as FileItem;
  });

  for (const f of files) {
    const owner = users.find(u => u.id === f.ownerId);
    if (owner) owner.storageUsed += f.size;
  }

  const shares: Share[] = [
    { id: 's1', resourceType: 'folder', resourceId: 'f1', ownerId: 'u2', sharedWithId: 'u3', permission: 'read',    createdAt: iso(14), updatedAt: iso(14) },
    { id: 's2', resourceType: 'file',   resourceId: 'a3', ownerId: 'u2', sharedWithId: 'u3', permission: 'edit',    createdAt: iso(13), updatedAt: iso(13) },
    { id: 's3', resourceType: 'file',   resourceId: 'b1', ownerId: 'u3', sharedWithId: 'u2', permission: 'comment', createdAt: iso(7),  updatedAt: iso(7) },
    { id: 's4', resourceType: 'folder', resourceId: 'f4', ownerId: 'u3', sharedWithId: 'u2', permission: 'read',    createdAt: iso(6),  updatedAt: iso(6) }
  ];

  const comments: Comment[] = [
    { id: 'c1', fileId: 'a3', author: { id: 'u3', name: 'Luis Pérez' }, text: 'Revisé el informe, todo en orden.', createdAt: iso(5) },
    { id: 'c2', fileId: 'b1', author: { id: 'u2', name: 'Ana López' },  text: '¿Podemos agregar una fase 3?',      createdAt: iso(4) }
  ];

  const activity: Activity[] = [
    { id: 'h1', user: { id: 'u2', name: 'Ana López' },  action: 'upload',    resource: { type: 'file', id: 'a3', name: 'informe-q1.md', ownerId: 'u2' }, createdAt: iso(24) },
    { id: 'h2', user: { id: 'u2', name: 'Ana López' },  action: 'share',     resource: { type: 'file', id: 'a3', name: 'informe-q1.md', ownerId: 'u2' }, details: { sharedWith: 'Luis Pérez', permission: 'edit' }, createdAt: iso(13) },
    { id: 'h3', user: { id: 'u3', name: 'Luis Pérez' }, action: 'comment',   resource: { type: 'file', id: 'a3', name: 'informe-q1.md', ownerId: 'u2' }, createdAt: iso(5) },
    { id: 'h4', user: { id: 'u3', name: 'Luis Pérez' }, action: 'upload',    resource: { type: 'file', id: 'b1', name: 'plan.md',       ownerId: 'u3' }, createdAt: iso(17) },
    { id: 'h5', user: { id: 'u2', name: 'Ana López' },  action: 'delete',    resource: { type: 'file', id: 'a6', name: 'viejo.txt',     ownerId: 'u2' }, createdAt: iso(1) }
  ];

  return { users, folders, files, shares, comments, activity, contents };
}