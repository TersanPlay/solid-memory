import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

const runtimeUrl = env('DATABASE_URL');
// Mantém a variável portátil e entrega ao engine um caminho absoluto no Windows.
const migrationUrl = runtimeUrl.startsWith('file:./')
  ? `file:${path.resolve(process.cwd(), runtimeUrl.slice('file:./'.length)).replaceAll('\\', '/')}`
  : runtimeUrl;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.js',
  },
  datasource: {
    url: migrationUrl,
  },
});
