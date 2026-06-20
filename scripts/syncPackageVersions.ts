import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

export type SyncFs = {
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
  readdirSync: typeof readdirSync;
};

export const WORKSPACE_PACKAGE_GLOB = 'packages/*/package.json';

export const listWorkspacePackageJsonPaths = (
  root: string,
  fs: Pick<SyncFs, 'readdirSync'>,
): string[] => {
  const packagesDir = join(root, 'packages');
  return fs
    .readdirSync(packagesDir, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => join(packagesDir, entry.name, 'package.json'))
    .sort();
};

export const setPackageJsonVersion = (
  filePath: string,
  version: string,
  fs: Pick<SyncFs, 'readFileSync' | 'writeFileSync'>,
): void => {
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    version?: string;
  };
  pkg.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
};

type LockfileVersionUpdate = {
  lockfilePath: string;
  version: string;
  root: string;
  workspacePackageJsonPaths: string[];
  fs: Pick<SyncFs, 'readFileSync' | 'writeFileSync'>;
};

export const setLockfileVersions = ({
  lockfilePath,
  version,
  root,
  workspacePackageJsonPaths,
  fs,
}: LockfileVersionUpdate): void => {
  const lock = JSON.parse(fs.readFileSync(lockfilePath, 'utf8')) as {
    version?: string;
    packages?: Record<string, {version?: string}>;
  };

  lock.version = version;

  const rootKey = '';
  if (lock.packages?.[rootKey]) {
    lock.packages[rootKey].version = version;
  }

  for (const pkgPath of workspacePackageJsonPaths) {
    const relative = pkgPath.startsWith(root)
      ? pkgPath.slice(root.length + 1)
      : pkgPath;
    const workspaceKey = relative
      .replaceAll('\\', '/')
      .replace(/\/package\.json$/u, '');
    if (lock.packages?.[workspaceKey]) {
      lock.packages[workspaceKey].version = version;
    }
  }

  fs.writeFileSync(lockfilePath, `${JSON.stringify(lock, null, 2)}\n`);
};

export const syncPackageVersions = (
  root: string,
  version: string,
  fs: SyncFs,
): string[] => {
  const rootPackageJson = join(root, 'package.json');
  const lockfilePath = join(root, 'package-lock.json');
  const workspacePackageJsonPaths = listWorkspacePackageJsonPaths(root, fs);

  setPackageJsonVersion(rootPackageJson, version, fs);
  for (const pkgPath of workspacePackageJsonPaths) {
    setPackageJsonVersion(pkgPath, version, fs);
  }

  setLockfileVersions({
    lockfilePath,
    version,
    root,
    workspacePackageJsonPaths,
    fs,
  });

  return [rootPackageJson, ...workspacePackageJsonPaths, lockfilePath];
};

export const isDirectRun = (
  argv: string[] = process.argv,
  modulePath: string = fileURLToPath(import.meta.url),
): boolean => {
  const entry = argv[1];
  if (!entry) {
    return false;
  }
  return modulePath === entry;
};

export const runSyncPackageVersionsCli = (
  version: string | undefined = process.argv[2],
  root: string = join(new URL('..', import.meta.url).pathname),
): void => {
  if (!version) {
    console.error('Usage: tsx scripts/syncPackageVersions.ts <version>');
    process.exit(1);
  }

  const updated = syncPackageVersions(root, version, {
    readFileSync,
    writeFileSync,
    readdirSync,
  });
  console.log(`Synced version ${version} in ${updated.length} files`);
};

export const maybeRunSyncPackageVersionsCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = runSyncPackageVersionsCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunSyncPackageVersionsCli();
