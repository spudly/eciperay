// Boots the live-suite stack (issue #233): builds the web package against
// the Supabase QA dataset and starts the real API server, which serves the
// built web app itself (packages/server/src/staticWeb.ts) — the same
// topology as the Fly deployments, so the suite exercises the PR's own
// build end to end.
//
// Required environment (the repo's PREVIEW_* secrets in CI):
//   PREVIEW_VITE_SUPABASE_URL, PREVIEW_VITE_SUPABASE_ANON_KEY  (web build)
//   PREVIEW_SUPABASE_URL, PREVIEW_SUPABASE_SECRET_KEY          (server)
//   PREVIEW_DATABASE_URL                                       (server DB)
// The server must never be pointed at production values here: this script
// reads ONLY the PREVIEW_* names, so a misconfigured job fails fast below
// instead of testing against production data.

import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.resolve(webDir, '../server');
const port = process.env['E2E_LIVE_PORT'] ?? '8080';

const required = [
  'PREVIEW_VITE_SUPABASE_URL',
  'PREVIEW_VITE_SUPABASE_ANON_KEY',
  'PREVIEW_SUPABASE_URL',
  'PREVIEW_SUPABASE_SECRET_KEY',
  'PREVIEW_DATABASE_URL',
];
const missing = required.filter(name => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `startStack: missing required environment: ${missing.join(', ')}.\n` +
      'The live suite targets the Supabase QA dataset via the PREVIEW_* ' +
      'secrets (issue #233); without them there is nothing safe to run.',
  );
  process.exit(1);
}

type RunOptions = {cwd: string; env: NodeJS.ProcessEnv};

const run = (command: string, args: string[], options: RunOptions) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {stdio: 'inherit', ...options});
    child.on('error', reject);
    child.on('exit', code =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)),
    );
  });

// Build the web bundle with the QA project's public values baked in (the
// default outDir, packages/web/dist, is where the server serves from).
await run('npx', ['vite', 'build'], {
  cwd: webDir,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: process.env['PREVIEW_VITE_SUPABASE_URL'],
    VITE_SUPABASE_ANON_KEY: process.env['PREVIEW_VITE_SUPABASE_ANON_KEY'],
  },
});

const server = spawn('npx', ['tsx', 'src/server.ts'], {
  cwd: serverDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,
    DATABASE_URL: process.env['PREVIEW_DATABASE_URL'],
    SUPABASE_URL: process.env['PREVIEW_SUPABASE_URL'],
    SUPABASE_SECRET_KEY: process.env['PREVIEW_SUPABASE_SECRET_KEY'],
  },
});

const stop = () => {
  server.kill('SIGTERM');
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
server.on('exit', code => {
  process.exit(code ?? 1);
});
