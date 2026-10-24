# FileForge — Manual Técnico

**Versión:** 1.0  
**Fecha:** 2026-10-23  
**Proyecto:** Sistema de Gestión Documental (Archivos 1, Proyecto 2)  
**Stack:** Angular 21 + Express 5 + MongoDB (Mongoose 9) + GridFS  

---

## Índice

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Requisitos Previos](#2-requisitos-previos)
3. [Estructura del Repositorio](#3-estructura-del-repositorio)
4. [Instalación y Puesta en Marcha](#4-instalación-y-puesta-en-marcha)
   - 4.1 [Opción A: Script `start.js`](#41-opción-a-script-startjs-recomendado)
   - 4.2 [Opción B: Manual](#42-opción-b-manual)
   - 4.3 [Cuentas Demo](#43-cuentas-demo-tras-seed)
5. [Modelo de Datos (MongoDB)](#5-modelo-de-datos-mongodb)
   - 5.1 [Colecciones](#51-colecciones)
   - 5.2 [Decisiones Clave](#52-decisiones-clave-ver-doc05-modelo-documentalmd)
   - 5.3 [Índices Principales](#53-índices-principales)
6. [API REST (Backend)](#6-api-rest-backend)
   - 6.1 [Autenticación](#61-autenticación)
   - 6.2 [Usuarios (solo admin)](#62-usuarios-solo-admin)
   - 6.3 [Carpetas](#63-carpetas)
   - 6.4 [Archivos](#64-archivos)
   - 6.5 [Compartidos](#65-compartidos)
   - 6.6 [Comentarios](#66-comentarios)
   - 6.7 [Papelera](#67-papelera)
   - 6.8 [Actividad](#68-actividad)
   - 6.9 [Reportes](#69-reportes-agregaciones-mongodb)
7. [Frontend — Arquitectura](#7-frontend--arquitectura)
   - 7.1 [Patrones](#71-patrones)
   - 7.2 [Módulos (Features)](#72-módulos-features)
   - 7.3 [Scripts Principales](#73-scripts-principales)
   - 7.4 [Variables de Entorno](#74-variables-de-entorno)
8. [Seguridad](#8-seguridad)
9. [Seed de Datos](#9-seed-de-datos-file-forge-apiscriptseedts)
10. [Testing](#10-testing)
11. [Despliegue (Producción)](#11-despliegue-producción)
12. [Diagramas](#12-diagramas-carpeta-fileforgedoc)
---

## 1. Resumen del Proyecto

FileForge es un sistema de gestión documental **cliente-servidor** con arquitectura desacoplada:

- **Frontend (Angular 21):** SPA con lazy loading, standalone components, signals, SCSS propio (paleta Zonai), iconos SVG (estilo Lucide), sin librerías UI externas.
- **Backend (Express 5 + TypeScript):** API REST con Mongoose 9, validación Zod, JWT (HS256), multer (memoryStorage), GridFS para contenido de archivos.
- **Base de datos:** MongoDB 9.x, base `fileforge`, bucket GridFS `contents`.
- **Autenticación:** JWT en header `Authorization: Bearer <token>`, expiración 8h, contraseñas con bcrypt (10 rounds).
- **Roles:** `admin` / `user`. Usuarios pueden estar `active: false` (no autentican, pero conservan histórico).
- **Permisos:** `read` | `comment` | `edit` (heredados por carpeta vía `ancestors`).
- **Soft delete:** papelera en cascada (`deleted`, `deletedAt`, `deletedRootId`), restauración con reanclaje y renombrado automático.

---

## 2. Requisitos Previos

| Herramienta | Versión |
|-------------|---------|
| Node.js | ≥ 20 (recomendado 24.16.0) |
| npm | ≥ 10 |
| MongoDB | 9.x (local en `127.0.0.1:27017`) |
| Angular CLI | 21.2.26 |
| TypeScript | 5.9.3 |

---

## 3. Estructura del Repositorio

```
Proyecto 2/
├── FileForge/                    # Raíz del repo (git)
│   ├── .gitignore
│   ├── package.json              # Scripts monorepo
│   ├── README.md                 # Documentación de usuario
│   ├── start.js                  # Arranque multiplataforma (Node)
│   ├── file-forge/               # Workspace Angular
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/         # Guards, interceptors, services, models, API
│   │   │   │   ├── shared/       # Componentes, pipes, iconos reutilizables
│   │   │   │   ├── layout/       # Shell, navbar, sidebar
│   │   │   │   └── features/     # Módulos por funcionalidad
│   │   │   ├── environments/     # environment.ts / development.ts
│   │   │   └── styles.scss       # Tokens CSS (paleta Zonai)
│   │   ├── angular.json
│   │   └── package.json
│   ├── file-forge-api/           # Backend Express + TS
│   │   ├── src/
│   │   │   ├── config/           # env.ts (Zod), db.ts (Mongoose)
│   │   │   ├── controllers/      # Handlers HTTP
│   │   │   ├── middlewares/      # authenticate, requireAdmin, upload, errorHandler, notFound
│   │   │   ├── models/           # Esquemas Mongoose + índices
│   │   │   ├── routes/           # Routers Express
│   │   │   ├── schemas/          # Validaciones Zod
│   │   │   ├── services/         # Lógica de negocio
│   │   │   ├── utils/            # GridFS, date-range, http-error, mongo-errors, object-id, validate
│   │   │   ├── scripts/seed.ts   # Datos de demostración
│   │   │   ├── app.ts            # createApp()
│   │   │   └── server.ts         # Entry point
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── doc/                      # Diagramas y manual técnico
│       ├── 01-casos-de-uso.drawio
│       ├── 02-diagramas-secuencia.drawio
│       ├── 03-despliegue.drawio
│       ├── 04-modelo-documental.drawio
│       └── 05-modelo-documental.md   # Justificación embebido vs referencia
├── fases-backend/               # Guías de implementación backend
├── fases-frontend/              # Guías de implementación frontend
└── opencode/                    # Contexto IA (fuera del repo)
    ├── README.md
    ├── contexto.md
    ├── estructura.json
    └── log.md
```

---

## 4. Instalación y Puesta en Marcha

### 4.1 Opción A: Script `start.js`

Desde la raíz `FileForge/`:

```bash
node start.js --setup --seed     # Instala deps, crea .env, siembra BD
node start.js --dev              # Arranca API (3000) + Web (4200) con logs
node start.js --prod             # Build + sirve SPA estático en puerto 3000
```

**Flags principales:**
- `--seed`           Ejecuta seed tras instalar
- `--build`          Compila frontend y backend
- `--prod`           Modo producción (sirve `dist/file-forge/browser`)
- `--reinstall`      Borra `node_modules` y `package-lock.json` antes de `npm ci`
- `--skip-install`   Omite `npm ci`
- `--no-mongo-check` No verifica MongoDB antes de arrancar
- `--web-port=<n>`   Puerto del frontend (default 4200)
- `-h, --help`       Ayuda

### 4.2 Opción B: Manual

**Backend (`file-forge-api/`):**
```bash
cp .env.example .env   # Edita MONGODB_URI, JWT_SECRET, CORS_ORIGIN
npm ci
npm run seed           # Pobla BD (4 usuarios, 50 archivos, 27 shares, etc.)
npm run dev            # tsx watch src/server.ts  → http://localhost:3000/api
```

**Frontend (`file-forge/`):**
```bash
npm ci
ng serve               # http://localhost:4200
```

**Nota:** `environment.useMock = false` para usar el backend real.

### 4.3 Cuentas Demo (tras seed)

| Email | Rol | Activo | Contraseña |
|-------|-----|--------|------------|
| admin@demo.com | admin | Sí | 123456 |
| ana@demo.com   | user  | Sí | 123456 |
| luis@demo.com  | user  | Sí | 123456 |
| carlos@demo.com| user  | No | 123456 |

---

## 5. Modelo de Datos (MongoDB)

### 5.1 Colecciones

| Colección | Descripción |
|-----------|-------------|
| `users` | Cuentas, roles, `storageUsed`, `lastLoginAt` |
| `folders` | Jerarquía con `parentId` + camino materializado `ancestors[]` |
| `files` | Metadatos + `contentId` (GridFS), soft delete |
| `shares` | N:M polimórfico (`resourceType` file/folder), permiso, único por recurso+usuario |
| `comments` | Por archivo, autor embebido (`UserRef`) |
| `activity` | Historial inmutable, usuario y recurso embebidos |
| `contents.files / contents.chunks` | GridFS bucket `contents` (binarios .txt/.md) |

### 5.2 Decisiones Clave (ver `doc/05-modelo-documental.md`)

- **`folders.ancestors`** (embebido): breadcrumb, herencia de permisos, borrado en cascada, detección de ciclos en O(1).
- **`files.contentId`** (referencia GridFS): contenido grande fuera del documento (16 MB límite), streaming.
- **`shares`** (colección propia): N:M, búsqueda "compartidos conmigo" por índice en `sharedWithId`.
- **`activity` / `comments`** (usuario/recurso embebidos): histórico inmutable aunque se borre el recurso o usuario.

### 5.3 Índices Principales

```js
// users
{ email: 1 } unique
{ role: 1, active: 1 }

// folders
{ ownerId: 1, parentId: 1, deleted: 1 }
{ ownerId: 1, parentId: 1, name: 1 } unique partialFilterExpression: { deleted: false }

// files
{ ownerId: 1, folderId: 1, deleted: 1 }
{ ownerId: 1, folderId: 1, name: 1 } unique partialFilterExpression: { deleted: false }

// shares
{ resourceType: 1, resourceId: 1, sharedWithId: 1 } unique
{ sharedWithId: 1, resourceType: 1 }

// activity
{ 'user._id': 1, createdAt: -1 }
{ 'resource._id': 1, createdAt: -1 }
{ 'resource.ownerId': 1, createdAt: -1 }
{ action: 1 }
```

---

## 6. API REST (Backend)

**Base URL:** `http://localhost:3000/api`  
**Autenticación:** `Authorization: Bearer <jwt>`  
**Errores:** `{ "message": "..." }` con status HTTP (400, 401, 403, 404, 409, 413, 500)

### 6.1 Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | `{email, password}` → `{token, user}` |
| POST | `/auth/register` | Público, crea `user` |
| GET | `/auth/me` | Usuario autenticado |
| PATCH | `/auth/me` | Editar perfil (nombre, email, cambio password con actual) |

### 6.2 Usuarios (solo admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/users` | Lista paginada |
| GET | `/users/sharing` | Para selector de compartir |
| POST | `/users` | Crear usuario (admin) |
| PATCH | `/users/:id` | Cambiar rol / activar-desactivar |

### 6.3 Carpetas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/folders?parentId=` | Hijos (raíz: `null` o `root`) |
| GET | `/folders/:id` | Detalle |
| GET | `/folders/breadcrumb` | Raíz |
| GET | `/folders/:id/breadcrumb` | Camino |
| POST | `/folders` | Crear (`name`, `parentId?`) |
| PATCH | `/folders/:id` | Renombrar/mover (`name?`, `newParentId?`) |
| DELETE | `/folders/:id` | Papelera en cascada |

### 6.4 Archivos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/files?folderId=&search=&extension=&dateFrom=&dateTo=&sortBy=&sortDir=&page=&pageSize=` | Lista con filtros |
| POST | `/files` | `multipart/form-data` (`file`, `folderId?`) → 201 |
| GET | `/files/:id` | Metadatos + `permission` efectivo |
| GET | `/files/:id/content` | Texto plano |
| PUT | `/files/:id/content` | Reemplazar contenido (ajusta `storageUsed`) |
| GET | `/files/:id/download` | Binario + `Content-Disposition` |
| PATCH | `/files/:id` | Renombrar/mover (`name?`, `newFolderId?`) |
| DELETE | `/files/:id` | Papelera |

### 6.5 Compartidos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/shares` | Crear/actualizar (upsert) |
| PATCH | `/shares/:id` | Cambiar permiso |
| DELETE | `/shares/:id` | Retirar |
| GET | `/shares?resourceType=&resourceId=` | Por recurso |
| GET | `/shares/by-me` | Compartidos por mí (con nombres) |
| GET | `/shares/with-me` | Compartidos conmigo |

### 6.6 Comentarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/files/:fileId/comments` | Requiere `read` |
| POST | `/files/:fileId/comments` | Requiere `comment` |
| PATCH | `/files/:fileId/comments/:commentId` | Solo autor |
| DELETE | `/files/:fileId/comments/:commentId` | Autor, propietario o admin |

### 6.7 Papelera

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/trash` | Raíces eliminadas del usuario |
| POST | `/trash/:type/:id/restore` | Restaurar (reancla/renombra) |
| DELETE | `/trash/:type/:id` | Borrado definitivo (GridFS + shares + comments + `storageUsed`) |

### 6.8 Actividad

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/activity?userId=&action=&resourceId=&dateFrom=&dateTo=&page=&pageSize=` | Paginado, alcance por rol |

### 6.9 Reportes (agregaciones MongoDB)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reports/files-by-type` | Conteo/tamaño por extensión |
| GET | `/reports/files-by-date` | Conteo/tamaño por día |
| GET | `/reports/files-by-operations?limit=` | Top archivos por actividad |
| GET | `/reports/top-users-by-files` | Admin: top 10 usuarios |
| GET | `/reports/users-by-shares` | Admin: usuarios con más recursos compartidos |
| GET | `/reports/files-by-shared-users` | Archivos con más usuarios |
| GET | `/reports/shared-by-user/:userId` | Admin: qué compartió un usuario |
| GET | `/reports/received-by-user/:userId` | Admin: qué recibió un usuario |
| GET | `/reports/activity-by-action` | Conteo por acción |
| GET | `/reports/activity-by-period?period=day|week|month` | Serie temporal |
| GET | `/reports/top-actions?limit=` | Ranking con % |
| GET | `/reports/storage-usage` | Por carpeta (usuario) o por usuario (admin) |

---

## 7. Frontend — Arquitectura

### 7.1 Patrones

- **Standalone components** + lazy loading (`loadComponent`).
- **Signals** para estado reactivo (`signal`, `computed`, `linkedSignal`).
- **`withComponentInputBinding()`** → parámetros de ruta como `@Input()`.
- **API abstracta** (`*Api` en `core/api/`) + `provideApi()` inyecta `Http*Api`.
- **Guards:** `authGuard` (shell), `guestGuard` (login), `roleGuard` (admin).
- **Interceptors:** `authInterceptor` (Bearer), `errorInterceptor` (normaliza a `ApiError`, 401 → logout).
- **SCSS propio:** tokens en `styles.scss`, clases globales (`.btn`, `.field`, `.dialog-actions`, `.sr-only`).
- **Iconos SVG:** `shared/icons/ui-icons.ts` → `<app-ui-icon [name]>`.
- **Pipes:** `FileSizePipe` (B/KB/MB), `MarkdownPipe` (sin dependencias, escapa HTML).

### 7.2 Módulos (Features)

| Feature | Rutas | Descripción |
|---------|-------|-------------|
| `auth` | `/login`, `/register` | Login + registro |
| `explorer` | `/explorer`, `/explorer/:folderId` | Navegación carpetas + breadcrumbs |
| `files` | `/file/:fileId` | Visor/editor .txt/.md + comentarios |
| `sharing` | `/shared-by-me`, `/shared-with-me` | Tablas con gestión |
| `trash` | `/trash` | Papelera con restaurar/eliminar |
| `activity` | `/activity` | Historial paginado + filtros |
| `reports` | `/reports` | 13 pestañas agrupadas (Archivos/Usuarios/Compartidos/Actividad) |
| `admin` | `/admin` | Panel usuarios + stats globales |

---

## 8. Scripts Principales

### 8.1 `file-forge/package.json` (raíz)

```json
{
  "scripts": {
    "dev": "node start.js --dev",
    "dev:seed": "node start.js --dev --seed",
    "setup": "node start.js --setup",
    "seed": "node start.js --seed",
    "build": "node start.js --build",
    "start": "node start.js --prod",
    "reinstall": "node start.js --reinstall"
  },
  "engines": { "node": ">=20" }
}
```

### 8.2 `file-forge-api/package.json`

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "seed": "tsx src/scripts/seed.ts"
  }
}
```

### 8.3 `file-forge/package.json` (Angular)

```json
{
  "scripts": {
    "start": "ng serve",
    "build": "ng build",
    "test": "ng test",
    "lint": "ng lint"
  }
}
```

---

## 9. Variables de Entorno

### Backend (`file-forge-api/.env`)

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/fileforge
JWT_SECRET=<aleatorio 32 chars, genera start.js>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:4200
```

### Frontend (`file-forge/src/environments/environment.ts`)

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  useMock: false
};
```

---

## 10. Seguridad

- **JWT HS256** firmado/verificado con algoritmo fijo.
- **`passwordHash`** excluido de `toJSON`.
- **CORS** restringido a `CORS_ORIGIN`.
- **`x-powered-by`** deshabilitado.
- **Validación Zod** en todas las entradas.
- **Multer** `memoryStorage` (sin límite de tamaño configurado; GridFS acepta chunks).
- **Rate-limit / Helmet** → pendientes (recomendados para producción).

---

## 11. Seed de Datos (`file-forge-api/src/scripts/seed.ts`)

Ejecutar: `npm run seed` (desde `file-forge-api/`).

**Crea:**
- 4 usuarios (3 activos + 1 inactivo)
- 11 carpetas jerárquicas (3 niveles máx.)
- 50 archivos `.txt`/`.md` con contenido en GridFS (tamaños 300 B – 4.5 KB)
- 27 comparticiones (3 permisos)
- 7 comentarios
- 1 carpeta + 4 archivos en papelera
- 149 eventos de actividad (30 días escalonados)
- `storageUsed` calculado por usuario

**Reglas:** se niega si `NODE_ENV=production`.

---

## 12. Testing

- **Backend:** sin tests automatizados.
- **Frontend:** Vitest configurado; mocks y specs eliminados. Pruebas manuales.

---

## 13. Despliegue (Producción)

1. `NODE_ENV=production` en backend.
2. `JWT_SECRET` fuerte (≥32 chars).
3. `CORS_ORIGIN` = dominio real del frontend.
4. MongoDB con autenticación + TLS.
5. `npm run build` en ambos; servir `dist/file-forge/browser` estático (nginx) + API en proceso separado (PM2/systemd).
6. `start.js --prod` sirve SPA + API en mismo puerto (3000).

---

## 14. Diagramas (carpeta `FileForge/doc/`)

| Archivo | Contenido |
|---------|-----------|
| `01-casos-de-uso.drawio` | Actores y UC (UC1–UC17) |
| `02-diagramas-secuencia.drawio` | Secuencias: login, subir, compartir, papelera, reportes |
| `03-despliegue.drawio` | Nodos: cliente, API, MongoDB, GridFS |
| `04-modelo-documental.drawio` | Diagrama ER colecciones/índices |
| `05-modelo-documental.md` | Justificación embebido vs referencia |
