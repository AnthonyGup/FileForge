# Modelo documental de FileForge

Documento complementario al diagrama [`04-modelo-documental.drawio`](./04-modelo-documental.drawio).
Explica las colecciones, las decisiones de diseno (embebido vs. referencia) y las reglas de
consistencia que sostienen el sistema de gestion documental.

## 1. Resumen de colecciones

| Coleccion | Rol | Documento |
|---|---|---|
| `users` | Identidad y rol | Datos de la cuenta, `role`, `active`, `storageUsed`, `lastLoginAt` |
| `folders` | Jerarquia de carpetas | `parentId`, camino materializado `ancestors`, banderas de papelera |
| `files` | Metadatos de archivo | `ownerId`, `folderId`, `contentId` (GridFS), banderas de papelera |
| `comments` | Comentarios de archivo | `fileId`, autor embebido, texto |
| `shares` | Comparticion N:M | `resourceType`, `resourceId`, `ownerId`, `sharedWithId`, `permission` |
| `activity` | Historial inmutable | Usuario y recurso embebidos, `action`, `details` |
| `contents.files` / `contents.chunks` | Contenido binario | GridFS, bucket `contents` |

El contenido de los archivos `.txt` y `.md` **no** vive en la coleccion `files`: se guarda en
GridFS y `files.contentId` lo referencia.

## 2. Decisiones de modelado

### 2.1 `users` — documento raiz

- La cuenta es la entidad central; `files` y `folders` referencian su propietario con `ownerId`
  y `shares` referencia emisor (`ownerId`) y destinatario (`sharedWithId`).
- Se referencia y no se embebe porque el usuario puede cambiar de nombre o correo y esos cambios
  deben reflejarse en todas sus relaciones sin reescribir documentos.
- `passwordHash` queda fuera de `toJSON`, por lo que nunca se serializa hacia el cliente.
- `storageUsed` es un **contador desnormalizado**. Evita sumar todos los archivos del propietario
  en cada consulta de almacenamiento; se ajusta con `$inc` al subir/editar/eliminar y se recalcula
  en el seed.
- Restricciones: `email` unico; `role` en `{admin, user}`; `active` controla el acceso sin borrar
  la cuenta, de modo que el historico se conserva.

### 2.2 `folders` — jerarquia con camino materializado

Cada carpeta guarda tres datos de estructura:

- `parentId`: referencia a la carpeta padre (`null` en la raiz).
- `ancestors`: arreglo embebido con los `_id` de **todos** los antecesores, de la raiz a la padre.
- `name`, `ownerId`: metadatos y propiedad.

Se combinan referencia y embebido a proposito:

- MongoDB no tiene consultas jerarquicas nativas; recorrer `parentId` nivel por nivel requeriria
  N consultas. Con `ancestors` el breadcrumb se resuelve en una sola consulta
  (`Folder.find({ _id: { $in: folder.ancestors } })`).
- La **herencia de permisos** de `shares` se calcula comparando la carpeta compartida contra
  `ancestors` del recurso, sin recorrer la jerarquia.
- El **borrado en cascada** de una carpeta encuentra todo su subarbol con
  `{ $or: [{ _id }, { ancestors: folder._id }] }`.
- La **prevencion de ciclos** al mover compara el destino: si la carpeta movida esta en
  `target.ancestors` o es el propio destino, el movimiento se rechaza.
- Al mover una carpeta se reescribe el camino de todo el subarbol en una sola operacion
  (`updateMany` con pipeline de agregacion).

Las banderas `deleted`, `deletedAt` y `deletedRootId` implementan el borrado logico y la papelera
en cascada: todos los descendientes de una carpeta eliminada comparten el mismo `deletedRootId`
(la raiz del subarbol), lo que permite restaurarlos juntos.

Un indice unico **parcial** sobre `{ownerId, parentId, name}` con `deleted: false` garantiza
nombres unicos solo entre carpetas activas: dos carpetas con el mismo nombre pueden coexistir si
una esta en la papelera.

### 2.3 `files` — metadatos embebidos y contenido referenciado

- Metadatos consultables (`name`, `extension`, `mimeType`, `size`) se embeben en el documento:
  busquedas, filtros, orden y reportes los leen sin tocar el contenido.
- `ownerId` y `folderId` son referencias. `folderId: null` significa "raiz del propietario".
- `contentId` referencia el archivo en GridFS. No se embebe porque:
  - el contenido puede superar el limite de 16 MB por documento de MongoDB;
  - el contenido grande se sirve por streaming y no debe cargarse para listar o filtrar;
  - GridFS trocea el binario en `contents.chunks` y mantiene el descriptor en `contents.files`.
- `deleted`, `deletedAt`, `deletedRootId` permiten mover el archivo a la papelera sin perder su
  contenido ni su historial.
- Al subir, primero se escribe el contenido en GridFS y luego se crea el documento; si la
  creacion falla se elimina el contenido para no dejar huerfanos. Al reemplazar contenido se
  borra el anterior y se ajusta `storageUsed` por el delta.

Indice unico parcial `{ownerId, folderId, name}` con `deleted: false`: no puede haber dos
archivos activos con el mismo nombre en la misma carpeta, pero si uno activo y otro en papelera.

### 2.4 `shares` — relacion de muchos a muchos

Compartir es una relacion N:M entre usuarios y recursos. Por eso se modela como coleccion
independiente con:

- `resourceType` + `resourceId`: referencia polimorfica a un `file` o a un `folder`.
- `ownerId`: emisor (propietario del recurso).
- `sharedWithId`: destinatario.
- `permission`: `read`, `comment` o `edit`.

No se embebe la lista de compartidos dentro de `files`/`folders` porque:

- un recurso puede compartirse con muchos usuarios y un usuario recibe muchos recursos;
- "compartidos conmigo" se resuelve con un indice sobre `sharedWithId` sin escanear cada recurso;
- cambiar o retirar un permiso es una actualizacion puntual.
- El **nombre** del recurso no se embebe: se resuelve con `$lookup` al listar, de modo que un
  renombrado no deja datos obsoletos.

El indice unico `{resourceType, resourceId, sharedWithId}` evita duplicados y permite hacer
*upsert* al volver a compartir con el mismo usuario actualizando el permiso.

### 2.5 `activity` — historial inmutable con datos embebidos

El historial debe conservar **quien**, **que recurso** y **cuando** aunque el usuario se
desactive o el recurso se elimine. Por eso `activity` embebe dos subdocumentos:

- `user` (`userRef`): `_id` y `name` del actor en el momento del evento.
- `resource` (`resourceRef`): `type`, `_id`, `name` y `ownerId` del recurso en ese momento.

Embebido y no referenciado porque el nombre es una **foto historica**: si el recurso se borra
definitivamente, el evento sigue siendo legible. Ademas `resource.ownerId` embebido permite
filtrar "actividad de mis recursos" con un indice, sin `$lookup`.

`details` es un campo libre (`Mixed`) para datos de contexto como `{ from, to }` en renombrados
o movimientos y el permiso en eventos de comparticion. El documento solo tiene `createdAt`
(`updatedAt: false`): un evento no se modifica.

### 2.6 `comments` — autor embebido

`fileId` referencia el archivo y `author` embebe `_id` + `name` con el mismo criterio que el
historial: el comentario conserva el nombre del autor aunque la cuenta se desactive. El indice
`{fileId, createdAt}` mantiene el listado cronologico eficiente.

## 3. Reglas de consistencia

1. **Nombres unicos activos.** Indices unicos parciales en `files` y `folders`; las
   comprobaciones en servicio devuelven `409` antes de escribir y los indices actuan como ultima
   defensa ante condiciones de carrera.
2. **Jerarquia sin ciclos.** Al mover una carpeta se rechaza el destino si es ella misma o un
   descendiente (`target.ancestors` contiene la carpeta movida).
3. **Mismo propietario al mover.** Carpetas y archivos solo se mueven dentro del arbol de su
   propietario.
4. **Papelera oculta.** Las consultas normales filtran `deleted: false`; solo `GET /trash` lee los
   documentos eliminados. La papelera muestra solo las raices del subarbol (`deletedRootId = _id`).
5. **Cascada y restauracion.** Eliminar una carpeta marca todo el subarbol con el mismo
   `deletedRootId`; restaurar reactiva la raiz y sus descendientes, reancla al padre si sigue vivo
   (o a la raiz) y renombra con sufijo ante colision.
6. **Permisos heredados.** El permiso efectivo de un recurso es el mayor entre la comparticion
   directa y las comparticiones de sus carpetas ancestro (`read < comment < edit`). El propietario
   siempre tiene control total.
7. **Integridad del contenido.** GridFS y `files` se mantienen sincronizados: sin huerfanos al
   subir, contenido anterior liberado al editar y contenido liberado al borrar definitivamente.
8. **Usuarios inactivos.** No pueden autenticarse (`403 Usuario inactivo`), pero sus documentos,
   recursos e historial permanecen.

## 4. Indices y su proposito

| Coleccion | Indice | Uso |
|---|---|---|
| `users` | `email` unico | Login y alta sin duplicados |
| `users` | `{role, active}` | Panel de administracion |
| `folders` | `{ownerId, parentId, deleted}` | Listar hijos de una carpeta |
| `folders` | `{ownerId, deleted, deletedAt}` | Papelera del propietario |
| `folders` | `{ownerId, parentId, name}` unico parcial | Nombre unico activo |
| `files` | `{ownerId, folderId, deleted}` | Listar archivos de una carpeta |
| `files` | `{ownerId, deleted, deletedAt}` | Papelera |
| `files` | `{ownerId, name}` | Busqueda por nombre |
| `files` | `{extension}` | Reporte por tipo |
| `files` | `{createdAt}` | Reportes por rango de fechas |
| `files` | `{ownerId, folderId, name}` unico parcial | Nombre unico activo |
| `shares` | `{resourceType, resourceId, sharedWithId}` unico | Evitar duplicados / upsert |
| `shares` | `{sharedWithId, resourceType}` | "Compartidos conmigo" |
| `shares` | `{ownerId, createdAt}` | "Compartidos por mi" y reportes |
| `comments` | `{fileId, createdAt}` | Listado cronologico |
| `activity` | `{user._id, createdAt}` | Historial por usuario |
| `activity` | `{resource._id, createdAt}` | Historial por recurso |
| `activity` | `{resource.ownerId, createdAt}` | Actividad de mis recursos |
| `activity` | `{action}` | Reporte por tipo de operacion |
| `activity` | `{createdAt}` | Reportes por periodo |

## 5. Reportes y agregaciones

Los reportes se resuelven con `aggregate` sobre `files`, `shares` y `activity`, no con recorridos
en la aplicacion:

- Agrupaciones por `extension`, dia, accion, periodo o propietario usan `$group` y
  `$dateTrunc`/`$dateToString`.
- Los nombres de usuario y recurso se resuelven con `$lookup` cuando el reporte necesita mostrar
  etiquetas legibles.
- Los rankings usan `$sort` + `$limit`, y los porcentajes de acciones se calculan dentro de
  MongoDB (`$group` total + `$divide`).
- La actividad conserva recursos eliminados gracias a los datos embebidos, por lo que los
  reportes historicos no dependen de que el recurso siga existiendo.

## 6. Correspondencia con los requisitos

| Requisito | Implementacion |
|---|---|
| Usuarios activos/inactivos sin perder historico | `users.active` + `activity` con usuario embebido |
| Carpetas y subcarpetas consistentes | `folders.parentId` + `ancestors` + validacion de ciclos |
| Archivos `.txt`/`.md` con contenido en MongoDB | `files` + GridFS bucket `contents` |
| Cargar, descargar, consultar, renombrar, mover, eliminar | Servicios de `files` y `folders` con validaciones |
| Busquedas y filtros | Indices por `ownerId`, `name`, `extension`, `createdAt` |
| Comparticion con permisos lectura/edicion/comentar | `shares.permission` + herencia por `ancestors` |
| Papelera con restaurar y eliminar definitivo | Banderas `deleted`/`deletedAt`/`deletedRootId` |
| Historial de actividad (quien, que, cuando) | `activity` con `user` y `resource` embebidos |
| Reportes de archivos, usuarios, comparticion y actividad | `aggregate` sobre `files`, `shares`, `activity` |
