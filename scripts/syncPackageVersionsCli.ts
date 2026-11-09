import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

import {
  findLockfileWorkspaceVersionMismatches,
  formatLockfileVersionMismatches,
  syncLockfileWorkspaceVersions,
  syncRootVersionToGroupVersion,
  type SyncFs,
} from './syncPackageVersions.ts';

const defaultFs: SyncFs = {readFileSync, writeFileSync};

export type SyncPackageVersionsCliDeps = {
  fs?: SyncFs;
  log?: Pick<Console, 'error' | 'log'>;
  exit?: (code: number) => void;
};

// Default mode stamps the workspace manifest versions into
// package-lock.json (run by the release workflow's version step, issue
// #416). `--sync-root` stamps the fixed group's version into the root
// manifest and the lockfile's root entries (run first by the same
// version step, issue #474). `--check` writes nothing and exits 1 when
// any owned lockfile entry disagrees with its manifest (run by CI on
// release PRs).
export const runSyncPackageVersionsCli = (
  root: string,
  argv: string[] = [],
  deps: SyncPackageVersionsCliDeps = {},
): void => {
  const fs = deps.fs ?? defaultFs;
  const log = deps.log ?? console;
  const exit =
    deps.exit ??
    ((code: number) => {
      /* c8 ignore next -- default process exit wrapper; tests inject exit */
      process.exit(code);
    });

  if (argv.includes('--sync-root')) {
    const version = syncRootVersionToGroupVersion(root, fs);
    log.log(`Synced the root version to ${version}.`);
    return;
  }

  if (argv.includes('--check')) {
    const mismatches = findLockfileWorkspaceVersionMismatches(root, fs);
    if (mismatches.length > 0) {
      log.error(
        'package-lock.json workspace versions are out of sync with the manifests:',
      );
      log.error(formatLockfileVersionMismatches(mismatches));
      log.error('Run `npm run sync:lockfile-versions` to fix.');
      exit(1);
      return;
    }
    log.log('package-lock.json workspace versions match the manifests.');
    return;
  }

  const fixed = syncLockfileWorkspaceVersions(root, fs);
  if (fixed.length > 0) {
    const noun = fixed.length === 1 ? 'entry' : 'entries';
    log.log(
      `Synced ${fixed.length} package-lock.json workspace version ${noun} to the manifests.`,
    );
  } else {
    log.log(
      'package-lock.json workspace versions already match the manifests.',
    );
  }
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

export const maybeRunSyncPackageVersionsCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = () => {
    /* c8 ignore next -- default CLI entrypoint delegates to runSyncPackageVersionsCli */
    runSyncPackageVersionsCli(
      join(fileURLToPath(new URL('.', import.meta.url)), '..'),
      process.argv.slice(2),
    );
  },
): void => {
  if (directRun) {
    run();
  }
};

maybeRunSyncPackageVersionsCli();
