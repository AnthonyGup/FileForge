import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { connectDb, disconnectDb } from '../config/db';
import { Activity, Comment, File, Folder, Share, User, ensureIndexes } from '../models';
import { clearContents } from '../utils/gridfs';

const DEMO_PASSWORD = '123456';

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

  console.log('Creando colecciones e índices...');
  await ensureIndexes();

  console.log('Creando usuarios...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = await User.insertMany([
    { name: 'Admin Sistema', email: 'admin@demo.com', passwordHash, role: 'admin' },
    { name: 'Ana López', email: 'ana@demo.com', passwordHash, role: 'user' },
    { name: 'Luis Pérez', email: 'luis@demo.com', passwordHash, role: 'user' }
  ]);

  for (const user of users) {
    console.log(` - ${user.email} (${user.role}) -> ${user.id}`);
  }

  console.log(`Seed completo. Contraseña de todos los usuarios: ${DEMO_PASSWORD}`);
  await disconnectDb();
}

main().catch(async err => {
  console.error('Error en el seed:', err instanceof Error ? err.message : err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});