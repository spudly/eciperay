import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

export type SyncFs = {
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
};

// The fixed changeset group's version lives in the app package's manifest
// (.changeset/config.json): changesets versions the six workspace packages
// together but never the workspace root.
export const GROUP_VERSION_PACKAGE_JSON = 'packages/app/package.json';

export const readGroupVersion = (
  root: string,
  fs: Pick<SyncFs, 'readFileSync'>,
): string => {
  const pkg = JSON.parse(
    fs.readFileSync(join(root, GROUP_VERSION_PACKAGE_JSON), 'utf8'),
  ) as {version?: unknown};
  if (typeof pkg.version !== 'string' || pkg.version === '') {
    throw new Error(
      `Expected a string version in ${GROUP_VERSION_PACKAGE_JSON}`,
    );
  }
  return pkg.version;
};

// Stamps a version into a single package.json (see setPackageJsonVersion
// below). Changesets versions the workspace packages itself, but never the
// workspace ROOT manifest, so the release version step syncs the root to
// the group's version with syncRootVersion (issue #474). The former
// sync-everything entry point — semantic-release's prepare step, which
// rewrote every manifest and the lockfile in one pass — was removed with
// the rest of the semantic-release remnants (issue #234).

// Syncs only what changesets does not: the root package.json version and
// the root entries of package-lock.json. Workspace package manifests and
// their lockfile entries were already bumped by `changeset version`.
export const syncRootVersion = (
  root: string,
  version: string,
  fs: SyncFs,
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

// Issue #474: the root version sync runs inside the release workflow's
// version step (on the Pending Release branch, through the reviewed PR),
// not in the publish step — the publish step's direct push to master is
// declined by the "Require CI before merge" ruleset.
export const syncRootVersionToGroupVersion = (
  root: string,
  fs: SyncFs,
): string => {
  const version = readGroupVersion(root, fs);
  syncRootVersion(root, version, fs);
  return version;
};

export type RootVersionMismatch = {
  rootVersion: string;
  groupVersion: string;
};

// Issue #474 (CodeRabbit round on PR #475): the lockfile check compares
// each lockfile entry with its own manifest, so a root manifest edited to
// a wrong version still passes when the lockfile agrees with it — and the
// publish step then hard-errors on the stale root. On release PRs (the
// only place CI runs the check) the root must equal the group's version.
export const findRootVersionMismatch = (
  root: string,
  fs: Pick<SyncFs, 'readFileSync'>,
): RootVersionMismatch | null => {
  const rootPkg = JSON.parse(
    fs.readFileSync(join(root, 'package.json'), 'utf8'),
  ) as {version?: unknown};
  if (typeof rootPkg.version !== 'string' || rootPkg.version === '') {
    throw new Error('Expected a string version in package.json');
  }
  const groupVersion = readGroupVersion(root, fs);
  return rootPkg.version === groupVersion
    ? null
    : {rootVersion: rootPkg.version, groupVersion};
};

export const setPackageJsonVersion = (
  filePath: string,
  version: string,
  fs: SyncFs,
): void => {
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    version?: string;
  };
  pkg.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
};

export type LockfileShape = {
  version?: string;
  packages?: Record<string, {version?: string}>;
};

// The lockfile entries this module owns: the root entry ("") plus one
// entry per workspace declared in the root manifest's `workspaces` list,
// keyed by the entry's path in package-lock.json's `packages` map. Other
// lockfile entries (real dependencies, stale leftovers) are never touched.
export type WorkspaceVersions = Record<string, string>;

const readManifestVersion = (
  root: string,
  manifestPath: string,
  fs: Pick<SyncFs, 'readFileSync'>,
): string => {
  const pkg = JSON.parse(fs.readFileSync(join(root, manifestPath), 'utf8')) as {
    version?: unknown;
  };
  if (typeof pkg.version !== 'string' || pkg.version === '') {
    throw new Error(`Expected a string version in ${manifestPath}`);
  }
  return pkg.version;
};

export const readWorkspaceVersions = (
  root: string,
  fs: Pick<SyncFs, 'readFileSync'>,
): WorkspaceVersions => {
  const rootPkg = JSON.parse(
    fs.readFileSync(join(root, 'package.json'), 'utf8'),
  ) as {version?: unknown; workspaces?: unknown};
  if (typeof rootPkg.version !== 'string' || rootPkg.version === '') {
    throw new Error('Expected a string version in package.json');
  }
  const workspaces = Array.isArray(rootPkg.workspaces)
    ? rootPkg.workspaces.filter(
        (entry): entry is string => typeof entry === 'string',
      )
    : [];
  const versions: WorkspaceVersions = {'': rootPkg.version};
  for (const workspace of workspaces) {
    versions[workspace] = readManifestVersion(
      root,
      join(workspace, 'package.json'),
      fs,
    );
  }
  return versions;
};

export type LockfileVersionMismatch = {
  entry: string;
  lockfileVersion: string | undefined;
  manifestVersion: string;
};

// Compares every owned lockfile entry against its manifest version. The
// lockfile's top-level `version` field mirrors the root entry. A missing
// owned entry is a mismatch (reported, never silently skipped): a
// regeneration that drops an entry is exactly the drift this guards.
export const findLockfileVersionMismatches = (
  lock: LockfileShape,
  versions: WorkspaceVersions,
): LockfileVersionMismatch[] => {
  const mismatches: LockfileVersionMismatch[] = [];
  if (lock.version !== versions['']) {
    mismatches.push({
      entry: '(lockfile version)',
      lockfileVersion: lock.version,
      manifestVersion: versions[''] ?? '',
    });
  }
  for (const [entry, manifestVersion] of Object.entries(versions)) {
    const lockfileVersion = lock.packages?.[entry]?.version;
    if (lockfileVersion !== manifestVersion) {
      mismatches.push({entry, lockfileVersion, manifestVersion});
    }
  }
  return mismatches;
};

// Deterministically stamps the manifest versions into the lockfile's
// owned entries — no dependency re-resolution, so nothing else in the
// lockfile can churn. Mutates `lock`; returns the mismatches it fixed.
export const syncLockfileVersions = (
  lock: LockfileShape,
  versions: WorkspaceVersions,
): LockfileVersionMismatch[] => {
  const mismatches = findLockfileVersionMismatches(lock, versions);
  const missing = mismatches.filter(
    mismatch =>
      mismatch.entry !== '(lockfile version)' &&
      lock.packages?.[mismatch.entry] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `package-lock.json is missing workspace entries: ${missing
        .map(mismatch => mismatch.entry || '(root)')
        .join(', ')}`,
    );
  }
  lock.version = versions[''];
  for (const [entry, manifestVersion] of Object.entries(versions)) {
    const lockEntry = lock.packages?.[entry];
    if (lockEntry) {
      lockEntry.version = manifestVersion;
    }
  }
  return mismatches;
};

// Issue #416: `changeset version` bumps the workspace manifests on the
// Pending Release branch but leaves package-lock.json's root and workspace
// entries at the previous release's version, and the next regeneration
// force-push wipes any manual fix. The release workflow therefore runs
// this sync inside its version step (see the `version-script` in
// .github/workflows/release.yml), so every regeneration commit leaves the
// branch with a synced lockfile.
export const syncLockfileWorkspaceVersions = (
  root: string,
  fs: SyncFs,
): LockfileVersionMismatch[] => {
  const versions = readWorkspaceVersions(root, fs);
  const lockfilePath = join(root, 'package-lock.json');
  const lock = JSON.parse(
    fs.readFileSync(lockfilePath, 'utf8'),
  ) as LockfileShape;
  const fixed = syncLockfileVersions(lock, versions);
  if (fixed.length > 0) {
    fs.writeFileSync(lockfilePath, `${JSON.stringify(lock, null, 2)}\n`);
  }
  return fixed;
};

export const findLockfileWorkspaceVersionMismatches = (
  root: string,
  fs: Pick<SyncFs, 'readFileSync'>,
): LockfileVersionMismatch[] => {
  const versions = readWorkspaceVersions(root, fs);
  const lock = JSON.parse(
    fs.readFileSync(join(root, 'package-lock.json'), 'utf8'),
  ) as LockfileShape;
  return findLockfileVersionMismatches(lock, versions);
};

export const formatLockfileVersionMismatches = (
  mismatches: LockfileVersionMismatch[],
): string =>
  mismatches
    .map(mismatch => {
      const entry = mismatch.entry || '(root)';
      const lockfileVersion = mismatch.lockfileVersion ?? '(missing)';
      return `  ${entry}: lockfile has ${lockfileVersion}, manifest has ${mismatch.manifestVersion}`;
    })
    .join('\n');
