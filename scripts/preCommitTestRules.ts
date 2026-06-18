import {existsSync} from 'node:fs';
import {basename, dirname, join, relative} from 'node:path';

import {isCoverageExcluded} from './preCommitCoverageExclusions.ts';

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
  if (!isSourceFile(relPath) || isCoverageExcluded(relPath, isTestFile)) {
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
  return colocatedTestPaths(root, sourceRelPath).some(candidate => {
    const candidateRel = relative(root, candidate);
    return existsSync(candidate) || stagedSet.has(candidateRel);
  });
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
  const packages = new Set<PackageName>();
  for (const file of stagedFiles) {
    if (isTestFile(file)) {
      continue;
    }
    const match = /^packages\/(app|client|server|web)\/src\//.exec(file);
    if (match) {
      packages.add(match[1] as PackageName);
    }
  }
  return PACKAGES_WITH_COVERAGE.filter(pkg => packages.has(pkg));
};
