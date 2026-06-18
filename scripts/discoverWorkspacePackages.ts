import {existsSync, readFileSync, readdirSync, appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const LINTABLE_EXTENSION = /\.(ts|tsx|js|cjs|mjs)$/u;

export const SKIPPED_DIRS = new Set([
  'node_modules',
  'coverage',
  'ios',
  'android',
  '.turbo',
]);

export type DiscoverFs = {
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  readdirSync: typeof readdirSync;
};

export const hasLintableFiles = (dir: string, fs: DiscoverFs): boolean => {
  if (!fs.existsSync(dir)) {
    return false;
  }

  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) {
        continue;
      }
      if (hasLintableFiles(fullPath, fs)) {
        return true;
      }
    } else if (LINTABLE_EXTENSION.test(entry.name)) {
      return true;
    }
  }

  return false;
};

export type DiscoverResult = {testPackages: string[]; lintPackages: string[]};

export const discoverWorkspacePackages = (
  root: string,
  workspaces: string[],
  fs: DiscoverFs,
): DiscoverResult => {
  const testPackages = workspaces.filter(ws => {
    const pkgPath = join(root, ws, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return false;
    }
    const {scripts = {}} = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    return scripts['test:coverage'] ?? scripts['test'];
  });

  const lintPackages = workspaces.filter(ws =>
    hasLintableFiles(join(root, ws), fs),
  );

  return {testPackages, lintPackages};
};

export const formatGithubOutput = ({
  testPackages,
  lintPackages,
}: DiscoverResult): string =>
  `test-packages=${JSON.stringify(testPackages)}\nlint-packages=${JSON.stringify(lintPackages)}\n`;

export const writeGithubOutput = (
  result: DiscoverResult,
  outputPath: string | undefined,
  append: typeof appendFileSync,
): void => {
  const body = formatGithubOutput(result);
  if (outputPath) {
    append(outputPath, body);
    return;
  }
  process.stdout.write(body);
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

export const runDiscoverWorkspacePackagesCli = (): void => {
  const root = join(new URL('..', import.meta.url).pathname);
  const {workspaces = []} = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  ) as {workspaces?: string[]};
  const fs: DiscoverFs = {existsSync, readFileSync, readdirSync};
  const result = discoverWorkspacePackages(root, workspaces, fs);
  writeGithubOutput(result, process.env['GITHUB_OUTPUT'], appendFileSync);
};

export const maybeRunDiscoverWorkspacePackagesCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = runDiscoverWorkspacePackagesCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunDiscoverWorkspacePackagesCli();
