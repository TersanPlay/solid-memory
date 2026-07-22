import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export function resolveDatabasePath(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl?.startsWith('file:')) {
    throw new Error('DATABASE_URL deve usar o formato file: para SQLite.');
  }

  const value = databaseUrl.slice('file:'.length);
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export function prepareDatabaseFile(databaseUrl = process.env.DATABASE_URL) {
  const databasePath = resolveDatabasePath(databaseUrl);
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  if (!fs.existsSync(databasePath)) {
    const database = new Database(databasePath);
    database.close();
  }
  return databasePath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  prepareDatabaseFile();
}
