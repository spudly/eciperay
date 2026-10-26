import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {setPackageJsonVersion} from './syncPackageVersions.ts';

export type ReleaseFs = {
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
  existsSync: typeof existsSync;
};

export type ReleaseExec = (command: string, args: string[]) => string;

export type PublishResult = {
  status: 'published' | 'already-released';
  version: string;
  tag: string;
};

// Changesets versions the seven workspace packages as one fixed group (see
// .changeset/config.json) but never versions the workspace root, while the
// root package.json version stays canonical (Android versionName, deploy
// fallbacks). This script is the changesets/action publish step: it bridges
// that gap. It runs from the repo root (the action's publish cwd).
export const VERSION_SOURCE_PACKAGE_JSON = 'packages/app/package.json';

// Changelogs are searched in this order for the new version's section when
// building the GitHub Release notes: the app package first, then the rest
// of the fixed group.
export const CHANGELOG_PATHS = [
  'packages/app/CHANGELOG.md',
  'packages/client/CHANGELOG.md',
  'packages/icons/CHANGELOG.md',
  'packages/mcp-server/CHANGELOG.md',
  'packages/server/CHANGELOG.md',
  'packages/types/CHANGELOG.md',
  'packages/web/CHANGELOG.md',
];

export const readGroupVersion = (
  root: string,
  fs: Pick<ReleaseFs, 'readFileSync'>,
): string => {
  const pkg = JSON.parse(
    fs.readFileSync(join(root, VERSION_SOURCE_PACKAGE_JSON), 'utf8'),
  ) as {version?: unknown};
  if (typeof pkg.version !== 'string' || pkg.version === '') {
    throw new Error(
      `Expected a string version in ${VERSION_SOURCE_PACKAGE_JSON}`,
    );
  }
  return pkg.version;
};

// Syncs only what changesets does not: the root package.json version and
// the root entries of package-lock.json. Workspace package manifests and
// their lockfile entries were already bumped by `changeset version`.
export const syncRootVersion = (
  root: string,
  version: string,
  fs: Pick<ReleaseFs, 'readFileSync' | 'writeFileSync'>,
): void => {
  setPackageJsonVersion(join(root, 'package.json'), version, fs);

  const lockfilePath = join(root, 'package-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockfilePath, 'utf8')) as {
    version?: string;
    packages?: Record<string, {version?: string}>;
  };
  lock.version = version;
  const rootEntry = lock.packages?.[''];
  if (rootEntry) {
    rootEntry.version = version;
  }
  fs.writeFileSync(lockfilePath, `${JSON.stringify(lock, null, 2)}\n`);
};

export const remoteTagExists = (exec: ReleaseExec, tag: string): boolean =>
  exec('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]).length > 0;

export const extractReleaseNotes = (
  changelog: string,
  version: string,
): string | null => {
  const lines = changelog.split('\n');
  const start = lines.findIndex(line => line.trim() === `## ${version}`);
  if (start === -1) {
    return null;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.startsWith('## '));
  const section = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
  return section === '' ? null : section;
};

export const readReleaseNotes = (
  root: string,
  version: string,
  fs: Pick<ReleaseFs, 'readFileSync' | 'existsSync'>,
): string => {
  for (const changelogPath of CHANGELOG_PATHS) {
    const absolutePath = join(root, changelogPath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    const notes = extractReleaseNotes(
      fs.readFileSync(absolutePath, 'utf8'),
      version,
    );
    if (notes !== null) {
      return notes;
    }
  }
  return `Release v${version}`;
};

// Idempotent: if the tag for the group's current version already exists
// on the remote, a previous run published this release and there is
// nothing to do. Otherwise sync the root version, commit it in the
// established `chore(release):` shape (the deploy-target resolver excludes
// those commits from its path diff), tag that commit, and open the GitHub
// Release with the changelog section as its notes.
export const publishChangesetRelease = (
  root: string,
  fs: ReleaseFs,
  exec: ReleaseExec,
): PublishResult => {
  const version = readGroupVersion(root, fs);
  const tag = `v${version}`;

  if (remoteTagExists(exec, tag)) {
    console.log(`Tag ${tag} already exists; nothing to publish.`);
    return {status: 'already-released', version, tag};
  }

  syncRootVersion(root, version, fs);

  exec('git', ['config', 'user.name', 'github-actions[bot]']);
  exec('git', [
    'config',
    'user.email',
    '41898282+github-actions[bot]@users.noreply.github.com',
  ]);
  exec('git', ['add', 'package.json', 'package-lock.json']);
  const stagedFiles = exec('git', ['diff', '--cached', '--name-only']);
  if (stagedFiles.length > 0) {
    exec('git', ['commit', '-m', `chore(release): ${version} [skip ci]`]);
    exec('git', ['push', 'origin', 'HEAD:master']);
  }

  exec('git', ['tag', tag]);
  exec('git', ['push', 'origin', tag]);

  const notes = readReleaseNotes(root, version, fs);
  exec('gh', ['release', 'create', tag, '--title', tag, '--notes', notes]);

  console.log(`Published ${tag}.`);
  return {status: 'published', version, tag};
};

export const execFileSyncExec: ReleaseExec = (command, args) =>
  execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();

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

export const runChangesetReleaseCli = (
  root: string = join(new URL('..', import.meta.url).pathname),
  exec: ReleaseExec = execFileSyncExec,
): void => {
  publishChangesetRelease(
    root,
    {readFileSync, writeFileSync, existsSync},
    exec,
  );
};

export const maybeRunChangesetReleaseCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = runChangesetReleaseCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunChangesetReleaseCli();
