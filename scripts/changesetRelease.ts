import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  GROUP_VERSION_PACKAGE_JSON,
  readGroupVersion,
  syncRootVersion,
} from './syncPackageVersions.ts';

export {readGroupVersion, syncRootVersion};

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

// Changesets versions the six workspace packages as one fixed group (see
// .changeset/config.json) but never versions the workspace root, while the
// root package.json version stays canonical (Android versionName, deploy
// fallbacks). The root sync now happens in the release workflow's version
// step (issue #474), so the Pending Release PR carries it through review;
// this script is the changesets/action publish step and only tags the
// already-synced master commit. It runs from the repo root (the action's
// publish cwd).
export const VERSION_SOURCE_PACKAGE_JSON = GROUP_VERSION_PACKAGE_JSON;

// Changelogs are searched in this order for the new version's section when
// building the GitHub Release notes: the app package first, then the rest
// of the fixed group.
export const CHANGELOG_PATHS = [
  'packages/app/CHANGELOG.md',
  'packages/client/CHANGELOG.md',
  'packages/mcp-server/CHANGELOG.md',
  'packages/server/CHANGELOG.md',
  'packages/types/CHANGELOG.md',
  'packages/web/CHANGELOG.md',
];

export const readRootVersion = (
  root: string,
  fs: Pick<ReleaseFs, 'readFileSync'>,
): string => {
  const pkg = JSON.parse(
    fs.readFileSync(join(root, 'package.json'), 'utf8'),
  ) as {version?: unknown};
  if (typeof pkg.version !== 'string' || pkg.version === '') {
    throw new Error('Expected a string version in package.json');
  }
  return pkg.version;
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
// nothing to do. Otherwise tag HEAD and open the GitHub Release with the
// changelog section as its notes. HEAD must already carry the root
// version sync (the release version step puts it on the release branch,
// issue #474): a direct push to master from here is declined by the
// "Require CI before merge" ruleset, so a stale root version is a hard
// error rather than something this step repairs.
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

  const rootVersion = readRootVersion(root, fs);
  if (rootVersion !== version) {
    throw new Error(
      `Root package.json version ${rootVersion} does not match the release version ${version}; the release version step must sync the root version before publish.`,
    );
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
