import '../loadEnv.js';
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import type {PoolClient} from 'pg';

import pool from './pool.js';

const MIGRATIONS_DIR = join(fileURLToPath(import.meta.url), '..', 'migrations');

const ensureMigrationsTable = (client: PoolClient) =>
  client.query(`
    create table if not exists _migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )
  `);

const getAppliedMigrations = async (
  client: PoolClient,
): Promise<Set<string>> => {
  const result = await client.query<{filename: string}>(
    'select filename from _migrations order by filename',
  );
  return new Set(result.rows.map(r => r.filename));
};

const getPendingFiles = async (applied: Set<string>): Promise<string[]> => {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter(f => f.endsWith('.sql') && !applied.has(f)).sort();
};

const applyMigration = async (client: PoolClient, file: string) => {
  const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
  console.log(`Applying migration: ${file}`);
  await client.query(sql);
  await client.query('insert into _migrations (filename) values ($1)', [file]);
};

const applyPending = async (client: PoolClient) => {
  await ensureMigrationsTable(client);
  const applied = await getAppliedMigrations(client);
  const pending = await getPendingFiles(applied);
  for (const file of pending) {
    await applyMigration(client, file);
  }
};

const runInTransaction = async (client: PoolClient) => {
  await client.query('begin');
  await applyPending(client);
  await client.query('commit');
  console.log('Migrations complete.');
};

const run = async () => {
  const client = await pool.connect();
  try {
    await runInTransaction(client);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

await run();
