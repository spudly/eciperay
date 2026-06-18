import {spawnSync, execSync} from 'node:child_process';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  affectedCoveragePackages,
  findMissingColocatedTests,
  type PackageName,
} from './preCommitTestRules.ts';

const root = join(new URL('..', import.meta.url).pathname);

const getStagedFiles = (): string[] => {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMRT', {
    encoding: 'utf8',
    cwd: root,
  }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n');
};

const getStagedAddedFiles = (): string[] => {
  const output = execSync('git diff --cached --name-only --diff-filter=A', {
    encoding: 'utf8',
    cwd: root,
  }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n');
};

const assertNewSourceHasColocatedTests = (
  addedFiles: string[],
  stagedFiles: string[],
): void => {
  const failures = findMissingColocatedTests(root, addedFiles, stagedFiles);
  if (failures.length === 0) {
    return;
  }

  console.error('New source files must include a colocated test file:\n');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
};

const runPackageCoverage = (packages: PackageName[]): void => {
  if (packages.length === 0) {
    console.log(
      'pre-commit: no src/ changes in test packages, skipping coverage',
    );
    return;
  }

  console.log(
    `pre-commit: running test:coverage for ${packages.map(pkg => `@eciperay/${pkg}`).join(', ')}`,
  );

  const args = [
    'turbo',
    'run',
    'test:coverage',
    ...packages.flatMap(pkg => ['--filter', `@eciperay/${pkg}`]),
  ];
  const result = spawnSync('npx', args, {cwd: root, stdio: 'inherit'});
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const main = () => {
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    return;
  }

  assertNewSourceHasColocatedTests(getStagedAddedFiles(), stagedFiles);
  runPackageCoverage(affectedCoveragePackages(stagedFiles));
};

const isDirectRun = (): boolean => {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return fileURLToPath(import.meta.url) === entry;
};

if (isDirectRun()) {
  main();
}
