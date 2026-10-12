import { env } from "./config/env";
import { connectDb, disconnectDb } from './config/db';
import { createApp } from "./app";
import {disconnect} from "mongoose";

async function main(): Promise<void> {
  await connectDb();

  const app = createApp();
  const server = app.listen(env.PORT, () =>  {
    console.log('API escuchando en http://localhost:${env.PORT}/api');
  })
  const shutdown = async (): Promise<void> => {
    console.log('Cerrando servidor...');
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('No se pudo iniciar el servidor:', err instanceof Error ? err.message : err);
});