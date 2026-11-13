import {existsSync} from 'node:fs';
import {basename, dirname, join, relative} from 'node:path';

import {affectedWorkspaces, findAffectedTests} from '@spudly/tooling';

import {isCoverageCollected} from './packageCoveragePatterns.ts';

export const PACKAGES_WITH_COVERAGE = [
  'app',
  'client',
  'server',
  'web',
] as const;

export type PackageName = (typeof PACKAGES_WITH_COVERAGE)[number];

export const isTestFile = (path: string): boolean =>
  /\.test\.(ts|tsx)$/.test(path);

const isSourceFile = (path: string): boolean =>
  /^packages\/(app|client|server|web)\/src\/.+\.(ts|tsx)$/.test(path);

/**
 * Web UI is usually covered by page/route tests; lib modules use colocated
 * tests.
 */
export const requiresColocatedTest = (relPath: string): boolean => {
  if (
    !isSourceFile(relPath) ||
    isTestFile(relPath) ||
    !isCoverageCollected(relPath)
  ) {
    return false;
  }
  if (relPath.startsWith('packages/web/src/')) {
    return relPath.startsWith('packages/web/src/lib/');
  }
  return true;
};

export const colocatedTestPaths = (root: string, relPath: string): string[] => {
  const dir = dirname(join(root, relPath));
  const base = basename(relPath).replace(/\.(ts|tsx)$/, '');
  return [join(dir, `${base}.test.ts`), join(dir, `${base}.test.tsx`)];
};

const hasColocatedTest = (
  root: string,
  sourceRelPath: string,
  stagedSet: Set<string>,
): boolean => {
  // Colocation mapping comes from @spudly/tooling (shared tooling
  // standard, #516): a staged colocated test counts, as does one that
  // already exists on disk. The shared discovery also accepts *.spec.*
  // and any extension, so results are filtered through this repo's
  // test-file predicate (.test.ts/.test.tsx only — the runners match
  // nothing else).
  const discovered = findAffectedTests([sourceRelPath], [...stagedSet]);
  if (discovered.some(isTestFile)) {
    return true;
  }
  return colocatedTestPaths(root, sourceRelPath).some(candidate =>
    existsSync(candidate),
  );
};

export const findMissingColocatedTests = (
  root: string,
  addedFiles: string[],
  stagedFiles: string[],
): string[] => {
  const stagedSet = new Set(stagedFiles);
  const failures: string[] = [];

  for (const rel of addedFiles) {
    if (!requiresColocatedTest(rel)) {
      continue;
    }
    if (hasColocatedTest(root, rel, stagedSet)) {
      continue;
    }
    const expected = colocatedTestPaths(root, rel)
      .map(path => relative(root, path))
      .join(' or ');
    failures.push(`${rel} (expected ${expected})`);
  }

  return failures;
};

export const affectedCoveragePackages = (
  stagedFiles: string[],
): PackageName[] => {
  // Workspace mapping comes from @spudly/tooling (shared tooling
  // standard, #516); the coverage semantics stay eciperay's: only
  // non-test files under a coverage package's src/ tree affect it.
  const eligible = stagedFiles.filter(
    file =>
      !isTestFile(file) &&
      /^packages\/(app|client|server|web)\/src\//.test(file),
  );
  const packages = new Set(
    affectedWorkspaces(eligible).map(ws => ws.replace(/^packages\//, '')),
  );
  return PACKAGES_WITH_COVERAGE.filter(pkg => packages.has(pkg));
};
