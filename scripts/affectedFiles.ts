import {execSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';

export type ExecDeps = {execSync: typeof execSync};

export const createDefaultExecDeps = (): ExecDeps => ({execSync});

const ROOT_ALL_AFFECTING = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.base.json',
  'turbo.json',
  'eslint.config.ts',
  'knip.ts',
]);

const SCRIPTS_AFFECTING = new Set(['jest.config.cjs', 'commitlint.config.cjs']);

const IGNORED_DIRS = ['docs/', '.github/', '.husky/', 'coverage/'];

const IGNORED_FILES = new Set(['Dockerfile', 'fly.toml', 'CONTRIBUTING.md']);

export const isAllAffectingRootFile = (relPath: string): boolean => {
  if (ROOT_ALL_AFFECTING.has(relPath)) {
    return true;
  }
  return relPath.startsWith('patches/');
};

export const isScriptsAffectingFile = (relPath: string): boolean => {
  if (SCRIPTS_AFFECTING.has(relPath)) {
    return true;
  }
  return (
    relPath.startsWith('scripts/') ||
    relPath.startsWith('eslint-rules/') ||
    relPath.startsWith('test/')
  );
};

export const isIgnoredFile = (relPath: string): boolean => {
  if (IGNORED_FILES.has(relPath) || relPath.endsWith('.md')) {
    return true;
  }
  return IGNORED_DIRS.some(dir => relPath.startsWith(dir));
};

const WORKSPACE_FILE = /^packages\/([^/]+)\//u;

export const workspaceForFile = (relPath: string): string | undefined => {
  const match = WORKSPACE_FILE.exec(relPath);
  const name = match?.[1];
  return name ? `packages/${name}` : undefined;
};

export const parseArgs = (
  argv: string[] = process.argv,
): {base?: string; all: boolean} => {
  const args = argv.slice(2);
  if (args.includes('--all')) {
    return {all: true};
  }
  const baseIndex = args.indexOf('--base');
  if (baseIndex === -1 || baseIndex + 1 >= args.length) {
    return {base: undefined, all: false};
  }
  return {base: args[baseIndex + 1], all: false};
};

/**
 * Explicit flags win, then GitHub PR env vars (origin/<base-ref>), otherwise
 * fall back to the full matrix (master pushes and local runs).
 */
export const resolveBase = (
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): {base?: string; all: boolean} => {
  const flags = parseArgs(argv);
  if (flags.all || flags.base) {
    return flags;
  }
  const baseRef = env['GITHUB_BASE_REF'];
  if (env['GITHUB_EVENT_NAME'] === 'pull_request' && baseRef) {
    return {base: `origin/${baseRef}`, all: false};
  }
  return {all: true};
};

export const getChangedFiles = (
  root: string,
  baseRef: string,
  exec: typeof execSync,
): string[] => {
  // Two-dot tree diff: needs only the two trees, so it works with shallow
  // clones. Never under-includes: any file the PR changed differs between
  // the two trees (unless master already contains it, in which case master
  // CI ran the full matrix on it).
  const output = exec(`git diff --name-only ${baseRef}..HEAD`, {
    encoding: 'utf8',
    cwd: root,
  }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n');
};

export const writeOutput = (body: string): void => {
  const outputPath = process.env['GITHUB_OUTPUT'];
  if (outputPath) {
    appendFileSync(outputPath, body);
    return;
  }
  process.stdout.write(body);
};
