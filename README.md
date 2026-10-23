# FileForge

Gestor de archivos con carpetas, compartidos por permisos, papelera, comentarios, historial de actividad y reportes.

- **Frontend:** Angular 21 (`file-forge/`)
- **Backend:** Express 5 + TypeScript + MongoDB (`file-forge-api/`)
- **Almacenamiento de contenido:** MongoDB GridFS

---

## Requisitos

| Herramienta | Versión mínima | Cómo instalar |
|---|---|---|
| **Node.js** | 20 | https://nodejs.org (LTS) |
| **npm** | 10 | Incluido con Node.js |
| **MongoDB** | 6 | https://www.mongodb.com/try/download/community |

Verifica que estén disponibles:

```bash
node --version
npm --version
```

MongoDB debe estar **en ejecución** antes de arrancar la app:

- **Windows:** inicia el servicio `MongoDB` (Administración de servicios) o ejecuta `mongod`.
- **macOS:** `brew services start mongodb-community`
- **Linux:** `sudo systemctl start mongod`

---

## Inicio rápido

Desde la carpeta raíz `FileForge/` (donde está `start.js`):

```bash
# 1) Instala dependencias si falta, crea .env y arranca backend + frontend
npm run dev

# 2) La primera vez querrás datos de ejemplo
npm run dev:seed
```

El script hace todo automáticamente:

1. Comprueba la versión de Node y la conexión a MongoDB.
2. Crea `file-forge-api/.env` con un `JWT_SECRET` aleatorio si no existe.
3. Instala dependencias de ambos proyectos (`npm ci`) si falta `node_modules`.
4. (Opcional con `--seed`) siembra la base de datos demo.
5. Arranca el backend y espera su `/api/health`.
6. Arranca el frontend y abre `http://localhost:4200`.

Para detener todo: **Ctrl+C** (el script cierra ambos procesos).

### Cuentas demo

Contraseña para todas: `123456`

| Correo | Rol |
|---|---|
| `admin@demo.com` | Administrador |
| `ana@demo.com` | Usuario |
| `luis@demo.com` | Usuario |
| `carlos@demo.com` | Usuario inactivo |

> Las cuentas demo solo existen después de ejecutar el seed (`npm run dev:seed` o `npm run seed`).

---

## Comandos disponibles

Todos se ejecutan desde `FileForge/`:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca en desarrollo (crea `.env` e instala si hace falta) |
| `npm run dev:seed` | Igual que `dev`, pero siembra datos demo antes de arrancar |
| `npm run seed` | Solo prepara dependencias y siembra la base de datos |
| `npm run setup` | Solo prepara: crea `.env` e instala dependencias |
| `npm run build` | Compila backend y frontend |
| `npm start` | Compila y arranca en modo producción local |
| `npm run reinstall` | Fuerza reinstalar dependencias de ambos proyectos |

### Opciones del script

```bash
node start.js [opciones]
```

| Opción | Descripción |
|---|---|
| `--seed` | Siembra la base de datos antes de arrancar |
| `--setup` | Solo prepara (env + dependencias; siembra si añades `--seed`) |
| `--build` | Compila ambos proyectos y termina |
| `--prod` | Compila y arranca en producción (sirve el frontend estático) |
| `--reinstall` | Fuerza `npm ci`/`npm install` en ambos proyectos |
| `--skip-install` | No instala dependencias |
| `--no-mongo-check` | Omite la comprobación de conexión a MongoDB |
| `--web-port=<n>` | Puerto del frontend en modo producción (por defecto `4200`) |
| `-h`, `--help` | Muestra la ayuda |

---

## Variables de entorno

El backend lee `file-forge-api/.env` (se crea solo la primera vez). Plantilla en `file-forge-api/.env.example`:

| Variable | Por defecto | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | Entorno de ejecución |
| `PORT` | `3000` | Puerto de la API |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/fileforge` | Cadena de conexión a MongoDB |
| `JWT_SECRET` | *(generado)* | Secreto para firmar tokens (mín. 16 caracteres) |
| `JWT_EXPIRES_IN` | `8h` | Vigencia del token |
| `CORS_ORIGIN` | `http://localhost:4200` | Origen permitido para el frontend |

> Si cambias `PORT`, actualiza también `file-forge/src/environments/environment.ts` (`apiUrl`).
> Si cambias el puerto del frontend, actualiza `CORS_ORIGIN`.

---

## Ejecución manual (sin el script)

### Backend

```bash
cd file-forge-api
npm install
npm run dev        # desarrollo (tsx watch)
# o
npm run build && npm start   # producción
```

### Frontend

```bash
cd file-forge
npm install
npm start          # http://localhost:4200
```

---

## Modo producción local

```bash
npm start
```

Esto compila ambos proyectos, arranca la API y sirve el frontend compilado desde `file-forge/dist/file-forge/browser` con un servidor estático interno (con fallback SPA). Por defecto el frontend queda en `http://localhost:4200`.

> El build de Angular fija `apiUrl` en `http://localhost:3000/api`. Para desplegar en otro host, edita `file-forge/src/environments/environment.ts` antes de compilar.

---

## Solución de problemas

**No conecta a MongoDB**
- Verifica que el servicio esté iniciado (ver [Requisitos](#requisitos)).
- Revisa `MONGODB_URI` en `file-forge-api/.env`.
- Puedes saltar la comprobación con `node start.js --no-mongo-check`, pero el backend fallará si no hay conexión.

**El puerto 3000 o 4200 está ocupado**
- Windows: `netstat -ano | findstr :3000` y luego `taskkill /PID <pid> /F`.
- macOS/Linux: `lsof -i :3000`.
- O cambia `PORT` en `.env` (y `apiUrl` en el frontend) / usa `--web-port`.

**`npm ci` falla**
- Borra `node_modules` y `package-lock.json` de ese proyecto y ejecuta `npm install`.
- O usa `npm run reinstall`.

**PowerShell bloquea scripts (`npm.ps1` no se puede cargar)**
- Ejecuta una vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**El seed no hace nada o pide entorno**
- El seed se niega a ejecutarse si `NODE_ENV=production`.
- Comprueba que MongoDB esté accesible.

---

## Estructura del proyecto

```
FileForge/
├── start.js               # Script de arranque multiplataforma
├── package.json           # Scripts del monorepo (dev, seed, build, start)
├── README.md
├── file-forge/            # Frontend Angular
│   └── src/environments/  # apiUrl de la API
└── file-forge-api/        # Backend Express + MongoDB
    ├── .env.example       # Plantilla de variables de entorno
    └── src/scripts/seed.ts
```

---

## Docker

Pendiente. El arranque actual funciona en Windows, macOS y Linux con Node.js y MongoDB locales.
