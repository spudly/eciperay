import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import type {SyncFs} from './syncPackageVersions.ts';

// Issue #445: Dependabot PR #222 raised the posthog specs in the workspace
// manifests but left the nested resolved versions in package-lock.json
// stale (posthog-node 5.56.1 under a ^5.57.0 spec, posthog-js 1.438.11
// under ^1.438.19). Routine `npm ci` does not enforce range satisfaction
// for those nested entries, so the desync survived green CI until a cold
// workspace-scoped install validated the tree. This module checks that
// every direct dependency of every workspace resolves, through npm's
// node_modules lookup from that workspace, to a locked version that
// satisfies the manifest spec.

export type LockfileSyncMismatch = {
  workspace: string;
  dependency: string;
  spec: string;
  lockfileVersion: string | undefined;
};

type ManifestShape = {
  workspaces?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type LockfilePackages = Record<
  string,
  {version?: string; link?: boolean} | undefined
>;

// Parses a version or partial version into [major, minor, patch]; a
// wildcard or missing segment is null. Returns null when a segment is
// neither numeric nor a wildcard. Prerelease/build suffixes are ignored:
// the specs used in this repo never carry them.
export const parseVersionParts = (
  version: string,
): (number | null)[] | null => {
  const core = version.replace(/^[v=]+/, '').split(/[-+]/)[0] ?? '';
  const segments = core.split('.');
  const parts: (number | null)[] = [];
  for (const segment of segments) {
    if (segment === 'x' || segment === 'X' || segment === '*') {
      parts.push(null);
    } else if (/^\d+$/.test(segment)) {
      parts.push(Number(segment));
    } else {
      return null;
    }
  }
  while (parts.length < 3) {
    parts.push(null);
  }
  return parts.slice(0, 3);
};

const compareParts = (a: (number | null)[], b: (number | null)[]): number => {
  for (let i = 0; i < 3; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
};

const satisfiesSingle = (version: string, spec: string): boolean => {
  const versionParts = parseVersionParts(version);
  const match = /^([~^><=]*)(.+)$/.exec(spec);
  const specBody = match?.[2];
  const specParts = specBody === undefined ? null : parseVersionParts(specBody);
  if (versionParts === null || specParts === null || match === null) {
    // A spec or version this check cannot parse is not this check's to
    // judge (non-registry specs are filtered by the caller); never fail
    // a build over a form the checker does not understand.
    return true;
  }
  const op = match[1];
  const cmp = compareParts(versionParts, specParts);
  if (op === '^') {
    if (cmp < 0) {
      return false;
    }
    const major = specParts[0] ?? null;
    const minor = specParts[1] ?? null;
    if (major !== null && major > 0) {
      return versionParts[0] === major;
    }
    if (minor !== null && minor > 0) {
      return versionParts[0] === 0 && versionParts[1] === minor;
    }
    return (
      versionParts[0] === 0 &&
      versionParts[1] === 0 &&
      versionParts[2] === specParts[2]
    );
  }
  if (op === '~') {
    return (
      cmp >= 0 &&
      versionParts[0] === specParts[0] &&
      versionParts[1] === specParts[1]
    );
  }
  if (op === '>=') {
    return cmp >= 0;
  }
  if (op === '<=') {
    return cmp <= 0;
  }
  if (op === '>') {
    return cmp > 0;
  }
  if (op === '<') {
    return cmp < 0;
  }
  // Exact ('' or '='): every specified segment must match.
  return specParts.every(
    (part, index) => part === null || part === versionParts[index],
  );
};

// Supports the spec forms used in this repo's manifests: '*', exact,
// caret, tilde, comparators, space-separated AND sets, and '||' OR sets.
export const versionSatisfiesSpec = (
  version: string,
  spec: string,
): boolean => {
  const trimmed = spec.trim();
  if (trimmed === '' || trimmed === '*' || trimmed === 'latest') {
    return true;
  }
  return trimmed.split('||').some(alternative =>
    alternative
      .trim()
      .split(/\s+/)
      .every(token => satisfiesSingle(version, token)),
  );
};

// npm alias specs ('npm:<name>@<range>') install the target package under
// the manifest's own dependency name, so the lockfile entry lives under
// that name while the version must satisfy the range after the last '@'.
// Returns the embedded range, or null when the spec is not an alias or
// carries no range (a bare 'npm:<name>' means the latest tag, which this
// check does not judge — the same stance as a bare dist-tag spec).
export const aliasSpecRange = (spec: string): string | null => {
  if (!spec.startsWith('npm:')) {
    return null;
  }
  const target = spec.slice('npm:'.length);
  const at = target.lastIndexOf('@');
  if (at <= 0 || at === target.length - 1) {
    return null;
  }
  return target.slice(at + 1);
};

// npm resolves a dependency of the workspace at `workspacePath` by walking
// from that workspace's own node_modules up through each ancestor's
// node_modules to the repo root — the nested per-workspace entries are
// exactly where #222's staleness lived.
export const resolutionCandidates = (
  workspacePath: string,
  dependency: string,
): string[] => {
  const candidates: string[] = [];
  let dir = workspacePath;
  for (;;) {
    candidates.push(
      dir === ''
        ? `node_modules/${dependency}`
        : `${dir}/node_modules/${dependency}`,
    );
    if (dir === '') {
      return candidates;
    }
    dir = dir.split('/').slice(0, -1).join('/');
  }
};

export const findLockfileDependencyMismatches = (
  root: string,
  fs: Pick<SyncFs, 'readFileSync'> = {readFileSync},
): LockfileSyncMismatch[] => {
  const rootManifest = JSON.parse(
    fs.readFileSync(join(root, 'package.json'), 'utf8'),
  ) as ManifestShape;
  const workspaces = Array.isArray(rootManifest.workspaces)
    ? rootManifest.workspaces.filter(
        (entry): entry is string => typeof entry === 'string',
      )
    : [];
  const lock = JSON.parse(
    fs.readFileSync(join(root, 'package-lock.json'), 'utf8'),
  ) as {packages?: LockfilePackages};
  const packages: LockfilePackages = lock.packages ?? {};

  const mismatches: LockfileSyncMismatch[] = [];
  for (const workspace of ['', ...workspaces]) {
    const manifest = (
      workspace === ''
        ? rootManifest
        : (JSON.parse(
            fs.readFileSync(join(root, workspace, 'package.json'), 'utf8'),
          ) as ManifestShape)
    ) as ManifestShape;
    const directDeps = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.optionalDependencies,
    };
    for (const [dependency, spec] of Object.entries(directDeps)) {
      // Only registry semver specs are checkable; workspace-internal and
      // non-registry specs (file:, link:, URLs) resolve outside the
      // lockfile's version map.
      if (/^(workspace|file|link|git|https?):/.test(spec)) {
        continue;
      }
      const entry = resolutionCandidates(workspace, dependency)
        .map(candidate => packages[candidate])
        .find(candidate => candidate !== undefined);
      if (entry?.link === true) {
        // Workspace-internal dependency: the lockfile entry links to the
        // workspace package itself, whose version the manifests own.
        continue;
      }
      const lockfileVersion = entry?.version;
      // Alias specs resolve under the manifest's dependency name (already
      // the lookup key above) but are judged against the embedded range.
      const judgedSpec = aliasSpecRange(spec) ?? spec;
      if (
        lockfileVersion === undefined ||
        !versionSatisfiesSpec(lockfileVersion, judgedSpec)
      ) {
        mismatches.push({workspace, dependency, spec, lockfileVersion});
      }
    }
  }
  return mismatches;
};

export const formatLockfileDependencyMismatches = (
  mismatches: LockfileSyncMismatch[],
): string =>
  mismatches
    .map(mismatch => {
      const workspace = mismatch.workspace || '(root)';
      const lockfileVersion = mismatch.lockfileVersion ?? '(missing)';
      return `  ${workspace}: ${mismatch.dependency} spec ${mismatch.spec}, lockfile has ${lockfileVersion}`;
    })
    .join('\n');
