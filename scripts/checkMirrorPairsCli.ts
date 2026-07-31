import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

import {checkMirrorPairs, formatMirrorPairErrors} from './checkMirrorPairs.ts';

export const listChangedFiles = (
  root: string,
  exec: typeof execSync = execSync,
): string[] => {
  const tracked = exec('git diff --name-only HEAD', {
    encoding: 'utf8',
    cwd: root,
  })
    .trim()
    .split('\n')
    .filter(Boolean);

  const untracked = exec('git ls-files --others --exclude-standard', {
    encoding: 'utf8',
    cwd: root,
  })
    .trim()
    .split('\n')
    .filter(Boolean);

  return [...new Set([...tracked, ...untracked])];
};

export const runCheckMirrorPairsCli = (
  root: string,
  deps: {
    exec?: typeof execSync;
    check?: typeof checkMirrorPairs;
    log?: Pick<Console, 'error' | 'log'>;
    exit?: (code: number) => void;
  } = {},
): void => {
  const exec = deps.exec ?? execSync;
  const check = deps.check ?? checkMirrorPairs;
  const log = deps.log ?? console;
  const exit =
    deps.exit ??
    ((code: number) => {
      /* c8 ignore next -- default process exit wrapper; tests inject exit */
      process.exit(code);
    });

  const errors = check({root, changedFiles: listChangedFiles(root, exec)});

  if (errors.length > 0) {
    log.error('UI parity registry check failed:\n');
    log.error(formatMirrorPairErrors(errors));
    exit(1);
    return;
  }

  log.log('UI parity registry check passed.');
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

export const maybeRunCheckMirrorPairsCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = () => {
    /* c8 ignore next -- default CLI entrypoint delegates to runCheckMirrorPairsCli */
    runCheckMirrorPairsCli(
      join(fileURLToPath(new URL('.', import.meta.url)), '..'),
    );
  },
): void => {
  if (directRun) {
    run();
  }
};

maybeRunCheckMirrorPairsCli();
