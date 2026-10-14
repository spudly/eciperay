import {spawnSync, execSync} from 'node:child_process';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  affectedCoveragePackages,
  findMissingColocatedTests,
  type PackageName,
} from './preCommitTestRules.ts';

export type ChildProcessDeps = {
  execSync: typeof execSync;
  spawnSync: typeof spawnSync;
};

export const createDefaultChildProcessDeps = (): ChildProcessDeps => ({
  execSync,
  spawnSync,
});

export const childProcessDepsFactory = {create: createDefaultChildProcessDeps};

export const getStagedFiles = (
  root: string,
  exec: typeof execSync,
): string[] => {
  const output = exec('git diff --cached --name-only --diff-filter=ACMRT', {
    encoding: 'utf8',
    cwd: root,
  }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n');
};

export const getStagedAddedFiles = (
  root: string,
  exec: typeof execSync,
): string[] => {
  const output = exec('git diff --cached --name-only --diff-filter=A', {
    encoding: 'utf8',
    cwd: root,
  }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n');
};

export const assertNewSourceHasColocatedTests = (
  root: string,
  addedFiles: string[],
  stagedFiles: string[],
  exit: (code: number) => never = code => {
    process.exit(code);
  },
): void => {
  const failures = findMissingColocatedTests(root, addedFiles, stagedFiles);
  if (failures.length === 0) {
    return;
  }

  console.error('New source files must include a colocated test file:\n');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  exit(1);
};

export const runPackageTests = (
  root: string,
  packages: PackageName[],
  spawn: typeof spawnSync,
  exit: (code: number) => never = code => {
    process.exit(code);
  },
): void => {
  if (packages.length === 0) {
    console.log('pre-commit: no src/ changes in test packages, skipping tests');
    return;
  }

  console.log(
    `pre-commit: running tests (no coverage) for ${packages.map(pkg => `@eciperay/${pkg}`).join(', ')}`,
  );

  const args = [
    'turbo',
    'run',
    'test',
    ...packages.flatMap(pkg => ['--filter', `@eciperay/${pkg}`]),
  ];
  const result = spawn('npx', args, {cwd: root, stdio: 'inherit'});
  if (result.status !== 0) {
    exit(result.status ?? 1);
  }
};

export const main = (
  root: string,
  deps: ChildProcessDeps,
  exit: (code: number) => never = code => {
    process.exit(code);
  },
): void => {
  const stagedFiles = getStagedFiles(root, deps.execSync);
  if (stagedFiles.length === 0) {
    return;
  }

  assertNewSourceHasColocatedTests(
    root,
    getStagedAddedFiles(root, deps.execSync),
    stagedFiles,
    exit,
  );
  runPackageTests(
    root,
    affectedCoveragePackages(stagedFiles),
    deps.spawnSync,
    exit,
  );
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

export const runPreCommitTestsCli = (
  root: string = join(new URL('..', import.meta.url).pathname),
  deps?: ChildProcessDeps,
): void => {
  main(root, deps ?? childProcessDepsFactory.create());
};

export const maybeRunPreCommitTestsCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = runPreCommitTestsCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunPreCommitTestsCli();
