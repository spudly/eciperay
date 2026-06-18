import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

type PackageJson = {engines?: {node?: string}};

export type ValidateFs = {
  readFileSync: typeof readFileSync;
  readdirSync: typeof readdirSync;
};

export const extractMajor = (constraint: string): string => {
  const [major = ''] = constraint.replaceAll(/[^0-9.]/g, '').split('.');
  return major;
};

export type ValidateResult = {
  ok: boolean;
  errors: string[];
  rootEngine: string;
};

const readJson = (fs: ValidateFs, path: string): PackageJson =>
  JSON.parse(fs.readFileSync(path, 'utf8')) as PackageJson;

const validateWorkspacePackages = (
  root: string,
  fs: ValidateFs,
  rootEngine: string,
  errors: string[],
): void => {
  const packageDirs = fs
    .readdirSync(join(root, 'packages'), {withFileTypes: true})
    .filter(d => d.isDirectory())
    .map(d => join(root, 'packages', d.name, 'package.json'));

  for (const pkgPath of packageDirs) {
    const pkg = readJson(fs, pkgPath);
    const major = extractMajor(pkg.engines?.node ?? '');
    const rel = pkgPath.replace(root, '');
    if (major !== rootEngine) {
      errors.push(
        `FAIL: ${rel} engines.node (${major}) does not match root (${rootEngine})`,
      );
    }
  }
};

const CI_NODE_CONFIG_PATHS = [
  '.github/workflows/ci.yml',
  '.github/actions/ci-setup/action.yml',
] as const;

const readCiNodeMajor = (root: string, fs: ValidateFs): string => {
  for (const relPath of CI_NODE_CONFIG_PATHS) {
    const content = fs.readFileSync(join(root, relPath), 'utf8');
    const match = /node-version:\s*['"]?(\d+)/.exec(content);
    if (match?.[1]) {
      return match[1];
    }
  }
  return '';
};

const validatePinnedNodeVersions = (
  root: string,
  fs: ValidateFs,
  rootEngine: string,
  errors: string[],
): void => {
  const nvmrc = fs.readFileSync(join(root, '.nvmrc'), 'utf8').trim();
  if (nvmrc !== rootEngine) {
    errors.push(
      `FAIL: .nvmrc (${nvmrc}) does not match root engines.node (${rootEngine})`,
    );
  }

  const ciNode = readCiNodeMajor(root, fs);
  if (!ciNode) {
    errors.push(
      'FAIL: no node-version found in .github/workflows/ci.yml or .github/actions/ci-setup/action.yml',
    );
    return;
  }
  if (ciNode !== rootEngine) {
    errors.push(
      `FAIL: CI node-version (${ciNode}) does not match root engines.node (${rootEngine})`,
    );
  }
};

export const validateNodeVersionConstraints = (
  root: string,
  fs: ValidateFs,
): ValidateResult => {
  const errors: string[] = [];
  const rootPkg = readJson(fs, join(root, 'package.json'));
  const rootEngine = extractMajor(rootPkg.engines?.node ?? '');

  if (!rootEngine) {
    return {
      ok: false,
      errors: ['FAIL: root package.json has no engines.node field'],
      rootEngine: '',
    };
  }

  validateWorkspacePackages(root, fs, rootEngine, errors);
  validatePinnedNodeVersions(root, fs, rootEngine, errors);

  return {ok: errors.length === 0, errors, rootEngine};
};

export const runValidateNodeVersion = (
  root: string,
  fs: ValidateFs,
): number => {
  const result = validateNodeVersionConstraints(root, fs);
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(error);
    }
    return 1;
  }

  console.log(
    `OK: all engines.node constraints, .nvmrc, and CI node-version agree on Node ${result.rootEngine}`,
  );
  return 0;
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

export const runValidateNodeVersionCli = (): never => {
  const root = join(new URL('..', import.meta.url).pathname);
  process.exit(runValidateNodeVersion(root, {readFileSync, readdirSync}));
};

export const maybeRunValidateNodeVersionCli = (
  directRun: boolean = isDirectRun(),
  run: () => never = runValidateNodeVersionCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunValidateNodeVersionCli();
