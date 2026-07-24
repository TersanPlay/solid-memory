import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase, initializeDatabase } from './db.js';

const config = loadConfig();
const prisma = createDatabase(config.databaseUrl);

try {
  await initializeDatabase(prisma);
  const app = createApp({ prisma, config });
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`SoftProtocolo disponível em http://127.0.0.1:${config.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} recebido; encerrando o servidor.`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error('Não foi possível iniciar o SoftProtocolo:', error.message);
  await prisma.$disconnect();
  process.exit(1);
}

