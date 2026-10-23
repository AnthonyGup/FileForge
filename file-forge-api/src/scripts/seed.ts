import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { connectDb, disconnectDb } from '../config/db';
import {
  Activity,
  ActivityAction,
  Comment,
  File,
  Folder,
  IComment,
  IFile,
  IFolder,
  IShare,
  Share,
  User,
  ensureIndexes
} from '../models';
import { clearContents, uploadContent } from '../utils/gridfs';

const DEMO_PASSWORD = '123456';
const TOTAL_DAYS = 30;

type NativeColl = { bulkWrite: (ops: any[]) => Promise<unknown> };

interface StampEntry {
  coll: NativeColl;
  id: Types.ObjectId;
  date: Date;
  withUpdated: boolean;
}

const stamps: StampEntry[] = [];

function ago(days: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, minute, (days * 17) % 60, 0);
  return d;
}

function stagger(index: number): Date {
  return ago((index * 7 + 3) % TOTAL_DAYS, 8 + (index % 10), (index * 11) % 60);
}

function stamp(coll: NativeColl, id: Types.ObjectId, date: Date, withUpdated = true): void {
  stamps.push({ coll, id, date, withUpdated });
}

async function applyStamps(): Promise<void> {
  for (const s of stamps) {
    await s.coll.bulkWrite([
      {
        updateOne: {
          filter: { _id: s.id },
          update: {
            $set: s.withUpdated ? { createdAt: s.date, updatedAt: s.date } : { createdAt: s.date }
          }
        }
      }
    ]);
  }
}

function contentFor(name: string, ext: string, targetSize: number): Buffer {
  const head = `${name}.${ext}\n\nContenido de demostracion de FileForge.\n`;
  const line = `- Linea de texto para ${name}.${ext}: el reporte agrupa por tipo y fecha.\n`;
  let text = head;
  while (Buffer.byteLength(text, 'utf8') < targetSize) text += line;
  return Buffer.from(text, 'utf8').subarray(0, targetSize);
}

interface FolderSpec {
  key: string;
  owner: string;
  name: string;
  parent?: string;
}

const folderSpecs: FolderSpec[] = [
  { key: 'ana-doc', owner: 'ana', name: 'Documentos' },
  { key: 'ana-info', owner: 'ana', name: 'Informes', parent: 'ana-doc' },
  { key: 'ana-2026', owner: 'ana', name: '2026', parent: 'ana-info' },
  { key: 'ana-notas', owner: 'ana', name: 'Notas' },
  { key: 'ana-proy', owner: 'ana', name: 'Proyectos' },
  { key: 'ana-app', owner: 'ana', name: 'App', parent: 'ana-proy' },
  { key: 'luis-esc', owner: 'luis', name: 'Escritos' },
  { key: 'luis-rec', owner: 'luis', name: 'Recetas' },
  { key: 'luis-fav', owner: 'luis', name: 'Favoritas', parent: 'luis-rec' },
  { key: 'carlos-bor', owner: 'carlos', name: 'Borradores' },
  { key: 'admin-plant', owner: 'admin', name: 'Plantillas' }
];

interface FileSpec {
  name: string;
  owner: string;
  folder?: string;
  ext: 'txt' | 'md';
}

const fileSpecs: FileSpec[] = [
  { name: 'leeme', owner: 'ana', ext: 'txt' },
  { name: 'tareas', owner: 'ana', ext: 'md' },
  { name: 'notas-viaje', owner: 'ana', ext: 'md' },
  { name: 'borrador-viejo', owner: 'ana', ext: 'txt' },
  { name: 'plan-anual', owner: 'ana', ext: 'md' },
  { name: 'presupuesto', owner: 'ana', folder: 'ana-doc', ext: 'txt' },
  { name: 'informe-2026', owner: 'ana', folder: 'ana-info', ext: 'md' },
  { name: 'resumen-2025', owner: 'ana', folder: 'ana-info', ext: 'md' },
  { name: 'datos', owner: 'ana', folder: 'ana-info', ext: 'txt' },
  { name: 'metricas', owner: 'ana', folder: 'ana-info', ext: 'txt' },
  { name: 'enero', owner: 'ana', folder: 'ana-2026', ext: 'txt' },
  { name: 'febrero', owner: 'ana', folder: 'ana-2026', ext: 'md' },
  { name: 'marzo', owner: 'ana', folder: 'ana-2026', ext: 'txt' },
  { name: 'ideas', owner: 'ana', folder: 'ana-notas', ext: 'md' },
  { name: 'recados', owner: 'ana', folder: 'ana-notas', ext: 'txt' },
  { name: 'lista-compras', owner: 'ana', folder: 'ana-notas', ext: 'txt' },
  { name: 'recordatorios', owner: 'ana', folder: 'ana-notas', ext: 'md' },
  { name: 'propuesta-app', owner: 'ana', folder: 'ana-proy', ext: 'md' },
  { name: 'notas-proyecto', owner: 'ana', folder: 'ana-proy', ext: 'txt' },
  { name: 'api-endpoints', owner: 'ana', folder: 'ana-app', ext: 'md' },
  { name: 'modelo-datos', owner: 'ana', folder: 'ana-app', ext: 'txt' },
  { name: 'recetas-luis', owner: 'luis', ext: 'txt' },
  { name: 'cuentos', owner: 'luis', ext: 'md' },
  { name: 'diario', owner: 'luis', ext: 'txt' },
  { name: 'cuento-1', owner: 'luis', folder: 'luis-esc', ext: 'md' },
  { name: 'poema', owner: 'luis', folder: 'luis-esc', ext: 'txt' },
  { name: 'guion', owner: 'luis', folder: 'luis-esc', ext: 'txt' },
  { name: 'paella', owner: 'luis', folder: 'luis-rec', ext: 'txt' },
  { name: 'guiso', owner: 'luis', folder: 'luis-rec', ext: 'txt' },
  { name: 'pastel', owner: 'luis', folder: 'luis-fav', ext: 'txt' },
  { name: 'tarta', owner: 'luis', folder: 'luis-fav', ext: 'md' },
  { name: 'borrador-carlos', owner: 'carlos', ext: 'txt' },
  { name: 'ideas-carlos', owner: 'carlos', ext: 'md' },
  { name: 'viejo-1', owner: 'carlos', folder: 'carlos-bor', ext: 'txt' },
  { name: 'viejo-2', owner: 'carlos', folder: 'carlos-bor', ext: 'md' },
  { name: 'archivo-carlos', owner: 'carlos', folder: 'carlos-bor', ext: 'txt' },
  { name: 'instrucciones', owner: 'admin', ext: 'md' },
  { name: 'checklist', owner: 'admin', ext: 'txt' },
  { name: 'plantilla-informe', owner: 'admin', folder: 'admin-plant', ext: 'md' },
  { name: 'plantilla-nota', owner: 'admin', folder: 'admin-plant', ext: 'txt' },
  { name: 'backup-sistema', owner: 'admin', folder: 'admin-plant', ext: 'txt' }
];

const trashedFiles = ['borrador-viejo', 'resumen-2025', 'pastel', 'tarta'];
const trashedFolder = 'luis-fav';

interface ShareSpec {
  owner: string;
  resource: string;
  to: string;
  permission: 'read' | 'comment' | 'edit';
  isFolder?: boolean;
}

const shareSpecs: ShareSpec[] = [
  { owner: 'ana', resource: 'informe-2026', to: 'luis', permission: 'read' },
  { owner: 'ana', resource: 'informe-2026', to: 'admin', permission: 'read' },
  { owner: 'ana', resource: 'informe-2026', to: 'carlos', permission: 'read' },
  { owner: 'ana', resource: 'datos', to: 'luis', permission: 'read' },
  { owner: 'ana', resource: 'datos', to: 'admin', permission: 'comment' },
  { owner: 'ana', resource: 'plan-anual', to: 'luis', permission: 'edit' },
  { owner: 'ana', resource: 'plan-anual', to: 'admin', permission: 'read' },
  { owner: 'ana', resource: 'notas-viaje', to: 'luis', permission: 'read' },
  { owner: 'ana', resource: 'tareas', to: 'luis', permission: 'comment' },
  { owner: 'ana', resource: 'ideas', to: 'luis', permission: 'read' },
  { owner: 'ana', resource: 'ana-doc', to: 'luis', permission: 'read', isFolder: true },
  { owner: 'ana', resource: 'ana-proy', to: 'luis', permission: 'edit', isFolder: true },
  { owner: 'ana', resource: 'propuesta-app', to: 'admin', permission: 'read' },
  { owner: 'ana', resource: 'lista-compras', to: 'carlos', permission: 'read' },
  { owner: 'ana', resource: 'enero', to: 'luis', permission: 'read' },
  { owner: 'luis', resource: 'cuentos', to: 'ana', permission: 'read' },
  { owner: 'luis', resource: 'cuento-1', to: 'ana', permission: 'edit' },
  { owner: 'luis', resource: 'poema', to: 'ana', permission: 'read' },
  { owner: 'luis', resource: 'guion', to: 'ana', permission: 'comment' },
  { owner: 'luis', resource: 'diario', to: 'admin', permission: 'read' },
  { owner: 'luis', resource: 'recetas-luis', to: 'ana', permission: 'read' },
  { owner: 'luis', resource: 'luis-esc', to: 'ana', permission: 'read', isFolder: true },
  { owner: 'luis', resource: 'paella', to: 'ana', permission: 'edit' },
  { owner: 'admin', resource: 'instrucciones', to: 'ana', permission: 'read' },
  { owner: 'admin', resource: 'plantilla-informe', to: 'luis', permission: 'read' },
  { owner: 'admin', resource: 'checklist', to: 'ana', permission: 'edit' },
  { owner: 'admin', resource: 'admin-plant', to: 'luis', permission: 'read', isFolder: true }
];

interface CommentSpec {
  file: string;
  author: string;
  text: string;
}

const commentSpecs: CommentSpec[] = [
  { file: 'informe-2026', author: 'luis', text: 'Revisado, correcto en general.' },
  { file: 'informe-2026', author: 'admin', text: 'Falta la conclusion del apartado 3.' },
  { file: 'informe-2026', author: 'ana', text: 'Actualizado hoy con las metricas.' },
  { file: 'cuentos', author: 'ana', text: 'Me gusto el inicio del segundo cuento.' },
  { file: 'diario', author: 'admin', text: 'Buen registro de la semana.' },
  { file: 'plantilla-informe', author: 'luis', text: 'Usada en el informe de marzo.' },
  { file: 'api-endpoints', author: 'ana', text: 'Listo para revisar la API.' }
];

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('El seed borra todos los datos y no puede ejecutarse en producción');
  }

  await connectDb();

  console.log('Limpiando datos...');
  await Promise.all([
    User.deleteMany({}),
    Folder.deleteMany({}),
    File.deleteMany({}),
    Share.deleteMany({}),
    Comment.deleteMany({}),
    Activity.deleteMany({}),
    clearContents()
  ]);
  stamps.length = 0;

  console.log('Creando colecciones e índices...');
  await ensureIndexes();

  console.log('Creando usuarios...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userDocs = await User.insertMany([
    { name: 'Admin Sistema', email: 'admin@demo.com', passwordHash, role: 'admin' },
    { name: 'Ana López', email: 'ana@demo.com', passwordHash, role: 'user' },
    { name: 'Luis Pérez', email: 'luis@demo.com', passwordHash, role: 'user' },
    { name: 'Carlos Gómez', email: 'carlos@demo.com', passwordHash, role: 'user', active: false }
  ]);
  const users: Record<string, (typeof userDocs)[number]> = {
    admin: userDocs[0],
    ana: userDocs[1],
    luis: userDocs[2],
    carlos: userDocs[3]
  };
  userDocs.forEach((u, i) => stamp(User.collection, u._id, stagger(i + 40)));
  for (const u of userDocs) {
    console.log(` - ${u.email} (${u.role}${u.active ? '' : ', inactivo'}) -> ${u.id}`);
  }

  console.log('Creando carpetas...');
  const folders: Record<string, InstanceType<typeof Folder> & { _id: Types.ObjectId }> = {};
  let folderIndex = 0;
  for (const spec of folderSpecs) {
    const parent = spec.parent ? folders[spec.parent] : null;
    const folder = await Folder.create({
      name: spec.name,
      ownerId: users[spec.owner]._id,
      parentId: parent ? parent._id : null,
      ancestors: parent ? [...parent.ancestors, parent._id] : []
    });
    folders[spec.key] = folder;
    stamp(Folder.collection, folder._id, stagger(folderIndex++));
  }

  console.log('Creando archivos con contenido en GridFS...');
  const files: Record<string, InstanceType<typeof File> & { _id: Types.ObjectId }> = {};
  let fileIndex = 0;
  for (const spec of fileSpecs) {
    const targetSize = 300 + ((fileIndex * 151) % 4200);
    const contentId = await uploadContent(
      contentFor(spec.name, spec.ext, targetSize),
      `${spec.name}.${spec.ext}`
    );
    const file = await File.create({
      name: spec.name,
      extension: spec.ext,
      mimeType: spec.ext === 'txt' ? 'text/plain' : 'text/markdown',
      size: targetSize,
      ownerId: users[spec.owner]._id,
      folderId: spec.folder ? folders[spec.folder]._id : null,
      contentId
    });
    files[spec.name] = file;
    stamp(File.collection, file._id, stagger(fileIndex++));
  }

  console.log('Moviendo elementos a la papelera...');
  const trashDate = ago(6, 9, 15);
  const folderFav = folders[trashedFolder];
  await Folder.updateOne(
    { _id: folderFav._id },
    { $set: { deleted: true, deletedAt: trashDate, deletedRootId: folderFav._id } }
  );
  stamp(Folder.collection, folderFav._id, stagger(77));
  for (const name of trashedFiles) {
    const file = files[name];
    const inFavFolder = file.folderId?.toString() === folderFav._id.toString();
    const rootId = inFavFolder ? folderFav._id : file._id;
    await File.updateOne(
      { _id: file._id },
      { $set: { deleted: true, deletedAt: trashDate, deletedRootId: rootId } }
    );
  }

  console.log('Calculando almacenamiento usado...');
  for (const key of Object.keys(users)) {
    const alive = Object.values(files).filter(
      f => !f.deleted && f.ownerId.toString() === users[key]._id.toString()
    );
    const total = alive.reduce((sum, f) => sum + f.size, 0);
    await User.updateOne({ _id: users[key]._id }, { $set: { storageUsed: total } });
  }

  console.log('Creando compartidos...');
  const shareDocs: Array<IShare & { _id: Types.ObjectId }> = [];
  let shareIndex = 0;
  for (const spec of shareSpecs) {
    const resource = spec.isFolder ? folders[spec.resource] : files[spec.resource];
    const share = await Share.create({
      resourceType: spec.isFolder ? 'folder' : 'file',
      resourceId: resource._id,
      ownerId: users[spec.owner]._id,
      sharedWithId: users[spec.to]._id,
      permission: spec.permission
    });
    shareDocs.push(share as IShare & { _id: Types.ObjectId });
    stamp(Share.collection, share._id, stagger(shareIndex++));
  }

  console.log('Creando comentarios...');
  const commentDocs: Array<IComment & { _id: Types.ObjectId }> = [];
  let commentIndex = 0;
  for (const spec of commentSpecs) {
    const author = users[spec.author];
    const comment = await Comment.create({
      fileId: files[spec.file]._id,
      author: { _id: author._id, name: author.name },
      text: spec.text
    });
    commentDocs.push(comment as IComment & { _id: Types.ObjectId });
    stamp(Comment.collection, comment._id, stagger(commentIndex++), false);
  }

  console.log('Generando historial de actividad...');
  type Ev = { user: string; action: ActivityAction; file?: string; folder?: string; when: Date };
  const evs: Ev[] = [];
  const push = (user: string, action: ActivityAction, when: Date, file?: string, folder?: string): void => {
    evs.push({ user, action, when, file, folder });
  };

  const loginOffsets = [
    ['ana', 30], ['ana', 21], ['ana', 10], ['ana', 0],
    ['luis', 28], ['luis', 19], ['luis', 8], ['luis', 1],
    ['admin', 25], ['admin', 12], ['admin', 2],
    ['carlos', 27], ['carlos', 15]
  ] as Array<[string, number]>;
  for (const [u, d] of loginOffsets) push(u, 'login', ago(d, 8 + (d % 9), (d * 13) % 60));

  for (const spec of folderSpecs) push(spec.owner, 'create_folder', stagger(folderIndex++), undefined, spec.key);
  for (const spec of fileSpecs) push(spec.owner, 'upload', stagger(fileIndex++), spec.name);
  for (const spec of shareSpecs) push(spec.owner, 'share', stagger(shareIndex++), spec.isFolder ? undefined : spec.resource, spec.isFolder ? spec.resource : undefined);
  for (const spec of commentSpecs) push(spec.author, 'comment', stagger(commentIndex++), spec.file);

  const downloads = ['informe-2026', 'datos', 'plan-anual', 'leeme', 'cuentos', 'poema', 'instrucciones', 'checklist', 'enero', 'febrero', 'marzo', 'recados', 'api-endpoints', 'modelo-datos', 'paella', 'guion', 'diario', 'plantilla-nota', 'presupuesto', 'metricas'];
  downloads.forEach((f, i) => {
    const spec = fileSpecs.find(s => s.name === f);
    if (spec) push(spec.owner, 'download', ago((i * 3) % TOTAL_DAYS, 10 + (i % 8), (i * 17) % 60), f);
  });

  const renames: Array<[string, number]> = [['tareas', 14], ['recados', 11], ['guion', 7], ['checklist', 3]];
  for (const [f, d] of renames) push(fileSpecs.find(s => s.name === f)!.owner, 'rename', ago(d, 12, 30), f);

  const moves: Array<[string, number]> = [['leeme', 18], ['notas-proyecto', 9], ['ideas-carlos', 5]];
  for (const [f, d] of moves) push(fileSpecs.find(s => s.name === f)!.owner, 'move', ago(d, 15, 45), f);

  const edits = ['informe-2026', 'plan-anual', 'cuento-1', 'instrucciones', 'api-endpoints'];
  edits.forEach((f, i) => push(fileSpecs.find(s => s.name === f)!.owner, 'edit', ago(4 + i * 3, 16, 10), f));

  push('ana', 'delete', ago(6, 9, 16), 'borrador-viejo');
  push('ana', 'delete', ago(6, 9, 17), 'resumen-2025');
  push('luis', 'delete', ago(6, 9, 18), undefined, 'luis-fav');
  push('ana', 'restore', ago(5, 11, 5), 'recordatorios');
  push('ana', 'update_share', ago(8, 13, 20), 'informe-2026');
  push('luis', 'update_share', ago(7, 17, 40), 'datos');
  push('ana', 'revoke_share', ago(12, 10, 0), 'recordatorios');
  push('luis', 'revoke_share', ago(10, 18, 25), 'guiso');
  push('admin', 'delete_permanent', ago(20, 9, 45));

  const activityDocs = evs.map(ev => {
    const actor = users[ev.user];
    let resource = null;
    if (ev.file) {
      const f = files[ev.file];
      resource = {
        type: 'file',
        _id: f._id,
        name: `${f.name}.${f.extension}`,
        ownerId: f.ownerId
      };
    } else if (ev.folder) {
      const fol = folders[ev.folder];
      resource = { type: 'folder', _id: fol._id, name: fol.name, ownerId: fol.ownerId };
    } else if (ev.action === 'delete_permanent') {
      resource = { type: 'file', _id: new Types.ObjectId(), name: 'temporal.txt', ownerId: users.admin._id };
    }
    return {
      user: { _id: actor._id, name: actor.name },
      action: ev.action,
      resource,
      details: {}
    };
  });
  const createdActivity = await Activity.insertMany(activityDocs);
  createdActivity.forEach((doc, i) => stamp(Activity.collection, doc._id, evs[i].when, false));

  const lastLogin: Record<string, Date> = {};
  for (const ev of evs) {
    if (ev.action !== 'login') continue;
    const prev = lastLogin[ev.user];
    if (!prev || ev.when > prev) lastLogin[ev.user] = ev.when;
  }
  for (const key of Object.keys(lastLogin)) {
    await User.updateOne({ _id: users[key]._id }, { $set: { lastLoginAt: lastLogin[key] } });
  }

  console.log('Asignando fechas históricas (últimos 30 días)...');
  await applyStamps();

  const [uCount, foCount, fiCount, shCount, coCount, acCount] = await Promise.all([
    User.countDocuments(),
    Folder.countDocuments(),
    File.countDocuments(),
    Share.countDocuments(),
    Comment.countDocuments(),
    Activity.countDocuments()
  ]);
  console.log(
    `Seed completo. users=${uCount} folders=${foCount} files=${fiCount} shares=${shCount} comments=${coCount} activity=${acCount}. Contraseña: ${DEMO_PASSWORD}`
  );
  await disconnectDb();
}

main().catch(async err => {
  console.error('Error en el seed:', err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
