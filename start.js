#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');
const { createReadStream, existsSync, readFileSync, statSync, writeFileSync } = require('node:fs');
const { createServer } = require('node:http');
const net = require('node:net');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const API_DIR = path.join(ROOT, 'file-forge-api');
const WEB_DIR = path.join(ROOT, 'file-forge');
const API_ENV = path.join(API_DIR, '.env');
const API_ENV_EXAMPLE = path.join(API_DIR, '.env.example');
const WEB_DIST = path.join(WEB_DIR, 'dist', 'file-forge', 'browser');

const IS_WIN = process.platform === 'win32';
const NPM = IS_WIN ? 'npm.cmd' : 'npm';
const MIN_NODE = 20;

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const ansi = (code) => (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
const C = {
  dim: ansi('2'),
  bold: ansi('1'),
  red: ansi('31'),
  green: ansi('32'),
  yellow: ansi('33'),
  blue: ansi('34'),
  magenta: ansi('35'),
  cyan: ansi('36'),
};

const children = [];
let shuttingDown = false;

function log(tag, color, message) {
  const prefix = color(`[${tag}]`);
  for (const line of String(message).split(/\r?\n/)) {
    if (line.length) process.stdout.write(`${prefix} ${line}\n`);
  }
}

function warn(message) {
  log('aviso', C.yellow, message);
}

function fail(message) {
  log('error', C.red, message);
}

function banner() {
  const title = [
    '  ______ _ _      ______                     ',
    ' |  ____(_) |    |  ____|                    ',
    ' | |__   _| | ___| |__ ___  _ __ __ _  ___   ',
    ' |  __| | | |/ _ \\  __/ _ \\| \'__/ _` |/ _ \\  ',
    ' | |    | | |  __/ | | (_) | | | (_| |  __/  ',
    ' |_|    |_|_|\\___|_|  \\___/|_|  \\__, |\\___|  ',
    '                                 __/ |       ',
    '                                |___/        ',
  ].join('\n');
  process.stdout.write(`\n${C.cyan(title)}\n\n`);
  process.stdout.write(`${C.dim('  Arranque multiplataforma | Angular + Express + MongoDB')}\n\n`);
}

function printHelp() {
  process.stdout.write(`
${C.bold('Uso:')} node start.js [opciones]

${C.bold('Opciones:')}
  --seed              Siembra la base de datos demo antes de arrancar
  --setup             Solo prepara: crea .env, instala dependencias (y siembra con --seed)
  --build             Compila backend y frontend, y termina
  --prod              Compila y arranca en modo produccion (sirve el frontend estatico)
  --reinstall         Fuerza reinstalar dependencias de ambos proyectos
  --skip-install      No instala dependencias
  --no-mongo-check    Omite la comprobacion de conexion a MongoDB
  --web-port=<n>      Puerto para el frontend en modo produccion (por defecto 4200)
  -h, --help          Muestra esta ayuda

${C.bold('Ejemplos:')}
  npm run dev             # desarrollo (crea .env e instala si hace falta)
  npm run dev:seed        # desarrollo + datos demo
  npm run seed            # solo sembrar la base de datos
  npm start               # produccion local
`);
}

function parseArgs(argv) {
  const opts = {
    seed: false,
    setup: false,
    build: false,
    prod: false,
    reinstall: false,
    skipInstall: false,
    noMongoCheck: false,
    webPort: null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--seed') opts.seed = true;
    else if (arg === '--setup') opts.setup = true;
    else if (arg === '--build') opts.build = true;
    else if (arg === '--prod') opts.prod = true;
    else if (arg === '--reinstall') opts.reinstall = true;
    else if (arg === '--skip-install') opts.skipInstall = true;
    else if (arg === '--no-mongo-check') opts.noMongoCheck = true;
    else if (arg === '-h' || arg === '--help') opts.help = true;
    else if (arg.startsWith('--web-port=')) opts.webPort = Number(arg.split('=')[1]);
    else {
      fail(`Opcion desconocida: ${arg}`);
      opts.help = true;
    }
  }

  if (opts.webPort !== null && (!Number.isInteger(opts.webPort) || opts.webPort <= 0)) {
    fail('--web-port debe ser un numero entero positivo');
    opts.help = true;
  }

  return opts;
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < MIN_NODE) {
    throw new Error(`Se requiere Node.js ${MIN_NODE} o superior (detectado ${process.versions.node}).`);
  }
}

function readEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;

  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function ensureEnv() {
  if (!existsSync(API_ENV)) {
    if (!existsSync(API_ENV_EXAMPLE)) {
      throw new Error(`No existe ${API_ENV_EXAMPLE}. No se puede crear file-forge-api/.env.`);
    }

    let content = readFileSync(API_ENV_EXAMPLE, 'utf8');
    const secret = crypto.randomBytes(48).toString('base64url');
    if (/^JWT_SECRET=.*$/m.test(content)) {
      content = content.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
    } else {
      content += `${content.endsWith('\n') ? '' : '\n'}JWT_SECRET=${secret}\n`;
    }

    writeFileSync(API_ENV, content, 'utf8');
    log('env', C.green, 'Creado file-forge-api/.env con un JWT_SECRET aleatorio.');
  } else {
    log('env', C.dim, 'file-forge-api/.env ya existe.');
  }

  return readEnvFile(API_ENV);
}

function tcpCheck(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

async function ensureMongo(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI no esta definido en file-forge-api/.env.');
  }

  if (uri.startsWith('mongodb+srv://')) {
    warn('MONGODB_URI usa SRV; se omite la comprobacion local de MongoDB.');
    return;
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    warn('No se pudo interpretar MONGODB_URI; se omite la comprobacion de MongoDB.');
    return;
  }

  const host = parsed.hostname || '127.0.0.1';
  const port = Number(parsed.port || 27017);
  const attempts = 15;

  process.stdout.write(`${C.cyan('[mongo]')} Comprobando ${host}:${port}... `);
  for (let i = 1; i <= attempts; i++) {
    if (await tcpCheck(host, port)) {
      process.stdout.write(`${C.green('OK')}\n`);
      return;
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write(`${C.red('sin conexion')}\n`);

  throw new Error(
    `No se pudo conectar a MongoDB en ${host}:${port}.\n` +
      '  - Asegurate de que MongoDB este instalado y en ejecucion.\n' +
      '  - Windows: el servicio "MongoDB" debe estar iniciado (services.msc) o ejecuta "mongod".\n' +
      '  - macOS: "brew services start mongodb-community".\n' +
      '  - Linux: "sudo systemctl start mongod".\n' +
      `  - O cambia MONGODB_URI en ${API_ENV}.`
  );
}

function runCommand(tag, color, command, args, cwd) {
  return new Promise((resolve, reject) => {
    log(tag, color, `$ ${command} ${args.join(' ')}`);
    const child = spawnCommand(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
    child.once('error', (err) => reject(new Error(`No se pudo ejecutar ${command}: ${err.message}`)));
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} termino con codigo ${code}`));
    });
  });
}

function spawnCommand(command, args, options) {
  if (IS_WIN) {
    return spawn([command, ...args].join(' '), { ...options, shell: true });
  }
  return spawn(command, args, options);
}

async function installDeps(opts) {
  const targets = [
    { dir: API_DIR, label: 'api' },
    { dir: WEB_DIR, label: 'web' },
  ];

  for (const { dir, label } of targets) {
    const modules = path.join(dir, 'node_modules');
    if (existsSync(modules) && !opts.reinstall) {
      log(label, C.dim, 'Dependencias ya instaladas.');
      continue;
    }

    const hasLock = existsSync(path.join(dir, 'package-lock.json'));
    const args = hasLock ? ['ci'] : ['install'];
    await runCommand(label, C.blue, NPM, args, dir);
  }
}

async function buildAll() {
  log('build', C.blue, 'Compilando backend...');
  await runCommand('build', C.blue, NPM, ['run', 'build'], API_DIR);

  log('build', C.blue, 'Compilando frontend...');
  await runCommand('build', C.blue, NPM, ['run', 'build'], WEB_DIR);
}

async function seedDatabase() {
  log('seed', C.magenta, 'Sembrando datos demo...');
  await runCommand('seed', C.magenta, NPM, ['run', 'seed'], API_DIR);
}

function spawnTracked(tag, color, command, args, cwd, env = {}) {
  const child = spawnCommand(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: !IS_WIN,
    env: { ...process.env, NG_CLI_ANALYTICS: 'false', NO_UPDATE_NOTIFIER: '1', ...env },
  });

  children.push(child);
  pipeWithPrefix(child.stdout, tag, color);
  pipeWithPrefix(child.stderr, tag, color);

  child.once('error', (err) => {
    fail(`${tag}: ${err.message}`);
  });

  child.once('exit', (code, signal) => {
    if (shuttingDown) return;
    warn(`${tag} termino inesperadamente (${code ?? signal ?? 'sin codigo'}).`);
    shutdown(code ?? 1);
  });

  return child;
}

function pipeWithPrefix(stream, tag, color) {
  if (!stream) return;
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.length) process.stdout.write(`${color(`[${tag}]`)} ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffer.length) process.stdout.write(`${color(`[${tag}]`)} ${buffer}\n`);
    buffer = '';
  });
}

async function portInUse(port) {
  if (await tcpCheck('127.0.0.1', port, 600)) return true;
  if (await tcpCheck('::1', port, 600)) return true;
  return false;
}

async function ensurePortFree(port, label) {
  if (!(await portInUse(port))) return;
  throw new Error(
    `El puerto ${port} (${label}) ya esta en uso.\n` +
      '  - Cierra el proceso que lo ocupa o cambia el puerto (PORT en .env / --web-port).\n' +
      '  - Windows: "netstat -ano | findstr :' + port + '" y luego "taskkill /PID <pid> /F".'
  );
}

async function waitForPort(port, child, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child && child.exitCode !== null) {
      throw new Error(`El proceso termino antes de abrir el puerto ${port}.`);
    }
    if (await tcpCheck('127.0.0.1', port, 500)) return;
    if (await tcpCheck('::1', port, 500)) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Se agoto el tiempo esperando el puerto ${port}.`);
}

async function waitForHealth(port, child, timeoutMs = 90000) {
  const start = Date.now();
  const url = `http://127.0.0.1:${port}/api/health`;

  while (Date.now() - start < timeoutMs) {
    if (child && child.exitCode !== null) {
      throw new Error('El backend termino antes de responder al health check.');
    }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // aun no esta listo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`El backend no respondio en ${url} tras ${Math.round(timeoutMs / 1000)}s.`);
}

function startApiDev() {
  log('api', C.cyan, 'Iniciando backend (tsx watch)...');
  return spawnTracked('api', C.cyan, NPM, ['run', 'dev'], API_DIR);
}

function startApiProd() {
  log('api', C.cyan, 'Iniciando backend (dist)...');
  return spawnTracked('api', C.cyan, NPM, ['start'], API_DIR);
}

function startWebDev() {
  log('web', C.green, 'Iniciando frontend (ng serve)...');
  return spawnTracked('web', C.green, NPM, ['start'], WEB_DIR);
}

function serveStatic(port) {
  if (!existsSync(WEB_DIST)) {
    throw new Error(`No se encontro el build del frontend en ${WEB_DIST}. Ejecuta "npm run build".`);
  }

  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
  };

  const server = createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch {
      res.writeHead(400).end('Solicitud invalida');
      return;
    }

    let filePath = path.join(WEB_DIST, pathname);
    const inRoot = filePath === WEB_DIST || filePath.startsWith(WEB_DIST + path.sep);
    if (!inRoot) {
      res.writeHead(403).end('Prohibido');
      return;
    }

    let isFile = false;
    try {
      isFile = statSync(filePath).isFile();
    } catch {
      isFile = false;
    }

    if (!isFile) {
      filePath = path.join(WEB_DIST, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': types[ext] || 'application/octet-stream' };

    if (filePath.includes(`${path.sep}media${path.sep}`) || /-[A-Z0-9]{8}\./.test(filePath)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }

    res.writeHead(200, headers);
    createReadStream(filePath).pipe(res);
  });

  server.on('error', (err) => {
    fail(`No se pudo servir el frontend: ${err.message}`);
    shutdown(1);
  });

  server.listen(port, '127.0.0.1', () => {
    log('web', C.green, `Servidor estatico escuchando en http://localhost:${port}`);
  });

  return server;
}

function stopChild(child) {
  if (!child || child.killed || child.exitCode !== null) return;

  if (IS_WIN) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignorar
    }
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  log('stop', C.dim, 'Cerrando procesos...');
  for (const child of children) stopChild(child);

  const force = setTimeout(() => process.exit(code), 1500);
  force.unref?.();

  setTimeout(() => process.exit(code), 700);
}

function printReady({ apiPort, webPort, seeded }) {
  const line = '='.repeat(48);
  process.stdout.write(`\n${C.dim(line)}\n`);
  process.stdout.write(`${C.bold('  FileForge esta en marcha')}\n\n`);
  process.stdout.write(`  Frontend:  ${C.cyan(`http://localhost:${webPort}`)}\n`);
  process.stdout.write(`  API:       ${C.cyan(`http://localhost:${apiPort}/api`)}\n`);
  process.stdout.write(`  Salud API: ${C.cyan(`http://localhost:${apiPort}/api/health`)}\n`);
  if (seeded) {
    process.stdout.write(`\n  ${C.bold('Cuentas demo')} (contrasena ${C.bold('123456')}):\n`);
    process.stdout.write('    admin@demo.com   (admin)\n');
    process.stdout.write('    ana@demo.com     (usuario)\n');
    process.stdout.write('    luis@demo.com    (usuario)\n');
    process.stdout.write('    carlos@demo.com  (usuario inactivo)\n');
  }
  process.stdout.write(`\n${C.dim('  Ctrl+C para detener.')}\n`);
  process.stdout.write(`${C.dim(line)}\n\n`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  banner();
  checkNode();

  const envVars = ensureEnv();
  const apiPort = Number(envVars.PORT || 3000);
  const webPort = opts.webPort ?? 4200;

  if (!opts.noMongoCheck) {
    await ensureMongo(envVars.MONGODB_URI);
  } else {
    warn('Comprobacion de MongoDB omitida (--no-mongo-check).');
  }

  if (!opts.skipInstall) {
    await installDeps(opts);
  } else {
    warn('Instalacion de dependencias omitida (--skip-install).');
  }

  if (opts.seed) {
    await seedDatabase();
  }

  if (opts.build) {
    await buildAll();
    log('ok', C.green, 'Build completado.');
    return;
  }

  if (opts.setup) {
    log('ok', C.green, 'Preparacion completada.');
    return;
  }

  if (opts.prod) {
    await buildAll();
  }

  await ensurePortFree(apiPort, 'API');
  await ensurePortFree(webPort, 'frontend');

  const apiChild = opts.prod ? startApiProd() : startApiDev();
  await waitForHealth(apiPort, apiChild);
  log('api', C.green, 'Backend listo.');

  if (opts.prod) {
    serveStatic(webPort);
    await waitForPort(webPort, null, 10000);
  } else {
    const webChild = startWebDev();
    await waitForPort(webPort, webChild);
    log('web', C.green, 'Frontend listo.');
  }

  printReady({ apiPort, webPort, seeded: opts.seed });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
  shutdown(1);
});
