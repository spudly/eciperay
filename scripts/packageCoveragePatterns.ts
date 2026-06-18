import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

type Micromatch = {
  isMatch: (target: string, patterns: string | string[]) => boolean;
};

const globMatch = (target: string, patterns: string[]): boolean => {
  const {isMatch} = require('micromatch') as Micromatch;
  return isMatch(target, patterns);
};

const JEST_PACKAGES = ['app', 'client', 'server'] as const;

type WebCoverageGlobs = {include: string[]; exclude: string[]};

export const loadJestCollectCoverageFrom = (
  pkg: string,
  readConfig: (path: string) => {collectCoverageFrom?: string[]} = path =>
    require(path) as {collectCoverageFrom?: string[]},
): string[] => {
  const configPath = join(root, 'packages', pkg, 'jest.config.cjs');
  const config = readConfig(configPath);
  return config.collectCoverageFrom ?? [];
};

const loadWebCoverageGlobs = (): WebCoverageGlobs => {
  const globsPath = join(root, 'packages/web/coverageGlobs.json');
  return JSON.parse(readFileSync(globsPath, 'utf8')) as WebCoverageGlobs;
};

const jestPatterns = (
  readConfig?: (path: string) => {collectCoverageFrom?: string[]},
): Map<string, string[]> => {
  const patterns = new Map<string, string[]>();
  for (const pkg of JEST_PACKAGES) {
    patterns.set(pkg, loadJestCollectCoverageFrom(pkg, readConfig));
  }
  return patterns;
};

const webGlobs = (): WebCoverageGlobs => loadWebCoverageGlobs();

const matchesCollectCoverageFrom = (
  subPath: string,
  patterns: string[],
): boolean => {
  const include = patterns.filter(pattern => !pattern.startsWith('!'));
  const exclude = patterns
    .filter(pattern => pattern.startsWith('!'))
    .map(pattern => pattern.slice(1));
  return globMatch(subPath, include) && !globMatch(subPath, exclude);
};

const matchesWebCoverage = (
  subPath: string,
  {include, exclude}: WebCoverageGlobs,
): boolean => globMatch(subPath, include) && !globMatch(subPath, exclude);

export const PACKAGE_PATH_PATTERN = /^packages\/([^/]+)\/(.+)$/;

type PatternsLookup = () => Map<string, string[]>;

export const isCoverageCollected = (
  relPath: string,
  patternsLookup: PatternsLookup = jestPatterns,
): boolean => {
  const match = PACKAGE_PATH_PATTERN.exec(relPath);
  if (!match) {
    return false;
  }
  const pkg = match[1];
  const subPath = match[2];
  if (pkg === undefined || subPath === undefined) {
    return false;
  }

  if (subPath.endsWith('.d.ts')) {
    return false;
  }

  if ((JEST_PACKAGES as readonly string[]).includes(pkg)) {
    const patterns = patternsLookup().get(pkg);
    if (patterns === undefined) {
      return false;
    }
    return matchesCollectCoverageFrom(subPath, patterns);
  }

  if (pkg === 'web') {
    return matchesWebCoverage(subPath, webGlobs());
  }

  return false;
};
