import { Types } from 'mongoose';
import { File, Folder, FolderDoc, UserDoc } from '../models';
import { CreateFolderInput, UpdateFolderInput } from '../schemas/folder.schemas';
import { HttpError } from '../utils/http-error';
import { isDuplicateKey } from '../utils/mongo-errors';
import { folderRef, logActivity } from './activity.service';
import { assertFolderAccess, assertFolderOwner } from './permission.service';

export interface BreadcrumbItem {
    id: string | null;
    name: string;
}

const ROOT_CRUMB: BreadcrumbItem = { id: null, name: 'Mis archivos' };

/**
 * Orden por nombre según el idioma, sin distinguir mayúsculas ni acentos.
 */
const NAME_COLLATION = { locale: 'es', strength: 2 };

/**
 * Lanza un 409 si ya hay una carpeta activa con ese nombre en el mismo lugar.
 */
export async function assertNameAvailable(
    ownerId: Types.ObjectId,
    parentId: Types.ObjectId | null,
    name: string,
    message = 'Ya existe una carpeta con ese nombre',
    excludeId?: Types.ObjectId
): Promise<void> {
    const exists = await Folder.exists({
        ownerId,
        parentId,
        name,
        deleted: false,
        ...(excludeId ? { _id: { $ne: excludeId } } : {})
    });
    if (exists) {
        throw HttpError.conflict(message);
    }
}

/**
 * Sin parentId (o root) devuelve las carpetas raíz del usuario, con parentId, las hijas.
 */
export async function listFolders(parentId: string | undefined, user: UserDoc): Promise<FolderDoc[]> {
    if (!parentId || parentId === 'root') {
        return Folder.find({ ownerId: user._id, parentId: null, deleted: false })
            .sort({ name: 1 })
            .collation(NAME_COLLATION);
    }

    const parent = await assertFolderAccess(parentId, 'read', user);
    return Folder.find({ parentId: parent._id, deleted: false })
        .sort({ name: 1 })
        .collation(NAME_COLLATION);
}

export function getFolder(id: string, user: UserDoc): Promise<FolderDoc> {
    return assertFolderAccess(id, 'read', user);
}

export async function getBreadcrumb(id: string | null, user: UserDoc): Promise<BreadcrumbItem[]> {
    if (id === null) {
        return [ROOT_CRUMB];
    }

    const folder = await assertFolderAccess(id, 'read', user);
    const ancestors = await Folder.find({ _id: { $in: folder.ancestors } }).select('name');
    const nameById = new Map(ancestors.map(a => [a.id, a.name]));

    return [
        ROOT_CRUMB,
        ...folder.ancestors.map(a => ({ id: a.toString(), name: nameById.get(a.toString()) ?? '(carpeta)' })),
        { id: folder.id, name: folder.name }
    ];
}

export async function createFolder(data: CreateFolderInput, user: UserDoc): Promise<FolderDoc> {
    let parent: FolderDoc | null = null;
    if (data.parentId) {
        parent = await assertFolderAccess(data.parentId, 'edit', user);
    }

    const ownerId = parent ? parent.ownerId : user._id;
    const parentId = parent ? parent._id : null;
    await assertNameAvailable(ownerId, parentId, data.name);

    let folder: FolderDoc;
    try {
        folder = await Folder.create({
            name: data.name,
            ownerId,
            parentId,
            ancestors: parent ? [...parent.ancestors, parent._id] : []
        });
    } catch (err) {
        if (isDuplicateKey(err)) {
            throw HttpError.conflict('Ya existe una carpeta con ese nombre');
        }
        throw err;
    }

    await logActivity({ user, action: 'create_folder', resource: folderRef(folder) });
    return folder;
}

function sameId(a: Types.ObjectId | null, b: Types.ObjectId | null): boolean {
    if (a === null || b === null) return a === b;
    return a.equals(b);
}

/** Renombra y/o mueve una carpeta, validando todo antes de escribir. */
export async function updateFolder(id: string, data: UpdateFolderInput, user: UserDoc): Promise<FolderDoc> {
    const folder = await assertFolderAccess(id, 'edit', user);

    const previousName = folder.name;
    const previousParentId = folder.parentId;

    // ---- Destino (solo si se pidió mover) ----
    const moving = data.newParentId !== undefined;
    let target: FolderDoc | null = null;

    if (moving && data.newParentId !== null && data.newParentId !== undefined) {
        target = await assertFolderAccess(data.newParentId, 'edit', user);

        const isItself = target._id.equals(folder._id);
        const isDescendant = target.ancestors.some(a => a.equals(folder._id));
        if (isItself || isDescendant) {
            throw HttpError.conflict('No se puede mover una carpeta dentro de sí misma o de una subcarpeta');
        }
        if (!target.ownerId.equals(folder.ownerId)) {
            throw HttpError.badRequest('Solo se puede mover dentro del mismo propietario');
        }
    }

    const newParentId = moving ? (target ? target._id : null) : previousParentId;
    const newName = data.name ?? previousName;
    const parentChanged = moving && !sameId(newParentId, previousParentId);
    const nameChanged = newName !== previousName;

    if (!parentChanged && !nameChanged) {
        return folder;                                   // nada que hacer
    }

    await assertNameAvailable(
        folder.ownerId,
        newParentId,
        newName,
        parentChanged ? 'Ya existe una carpeta con ese nombre en el destino' : 'Ya existe una carpeta con ese nombre',
        folder._id
    );

    // ---- Escritura ----
    folder.name = newName;
    if (parentChanged) {
        folder.parentId = newParentId;
        folder.ancestors = target ? [...target.ancestors, target._id] : [];
    }

    try {
        await folder.save();
    } catch (err) {
        if (isDuplicateKey(err)) {
            throw HttpError.conflict('Ya existe una carpeta con ese nombre');
        }
        throw err;
    }

    if (parentChanged) {
        // Reescribe los ancestros de todo el subárbol en una sola operación:
        // [nuevos ancestros de la carpeta] + [desde la carpeta movida hasta el final del arreglo]
        const newAncestors = [...folder.ancestors];
        await Folder.updateMany(
            { ancestors: folder._id },
            [
                {
                    $set: {
                        ancestors: {
                            $concatArrays: [
                                newAncestors,
                                {
                                    $slice: [
                                        '$ancestors',
                                        { $indexOfArray: ['$ancestors', folder._id] },
                                        { $size: '$ancestors' }
                                    ]
                                }
                            ]
                        }
                    }
                }
            ],
            { updatePipeline: true }
        );
    }

    // ---- Historial ----
    const resource = folderRef(folder);
    if (nameChanged) {
        await logActivity({ user, action: 'rename', resource, details: { from: previousName, to: newName } });
    }
  if (parentChanged) {
    await logActivity({ user, action: 'move', resource, details: { from: previousParentId, to: newParentId } });
  }

  return folder;
}

export async function deleteFolder(id: string, user: UserDoc): Promise<void> {
  const folder = await assertFolderOwner(id, user);
  const now = new Date();

  const subtree = await Folder.find({
    deleted: false,
    $or: [{ _id: folder._id }, { ancestors: folder._id }]
  }).select('_id');
  const folderIds = subtree.map(f => f._id);

  await Folder.updateMany(
    { _id: { $in: folderIds } },
    { $set: { deleted: true, deletedAt: now, deletedRootId: folder._id } }
  );
  await File.updateMany(
    { folderId: { $in: folderIds }, deleted: false },
    { $set: { deleted: true, deletedAt: now, deletedRootId: folder._id } }
  );

  await logActivity({ user, action: 'delete', resource: folderRef(folder) });
}
