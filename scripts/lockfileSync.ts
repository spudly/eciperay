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
// neither numeric nor a wildcard. Only the core is returned here;
// prerelease identifiers are parsed separately (prereleaseIdentifiers)
// and build metadata is ignored, as semver precedence ignores it.
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

// The dot-separated prerelease identifiers of a version or spec body
// ('1.2.3-beta.1+build' -> ['beta', '1']), or null when there is no
// prerelease. Build metadata (after '+') never affects precedence.
export const prereleaseIdentifiers = (version: string): string[] | null => {
  const withoutBuild = version.replace(/^[v=]+/, '').split('+')[0] ?? '';
  const dash = withoutBuild.indexOf('-');
  if (dash === -1) {
    return null;
  }
  return withoutBuild.slice(dash + 1).split('.');
};

// Semver prerelease precedence: a release outranks its prereleases;
// numeric identifiers compare numerically and rank below alphanumeric
// ones; a shorter identifier list ranks below a longer one it prefixes.
const comparePrereleases = (a: string[] | null, b: string[] | null): number => {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === undefined) {
      return -1;
    }
    if (right === undefined) {
      return 1;
    }
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) {
      const diff = Number(left) - Number(right);
      if (diff !== 0) {
        return diff;
      }
    } else if (leftNumeric) {
      return -1;
    } else if (rightNumeric) {
      return 1;
    } else if (left !== right) {
      return left < right ? -1 : 1;
    }
  }
  return 0;
};

// Full semver comparison (core, then prerelease precedence) of two
// version bodies whose cores both parsed.
const compareFull = (
  versionParts: (number | null)[],
  versionPre: string[] | null,
  specParts: (number | null)[],
  specPre: string[] | null,
): number => {
  const core = compareParts(versionParts, specParts);
  return core !== 0 ? core : comparePrereleases(versionPre, specPre);
};

type PrimitiveComparator = {
  op: '<' | '<=' | '>' | '>=' | '=';
  core: [number, number, number];
  pre: string[] | null;
};

type SpecBody = {
  // Core segments, padded to three; null marks a wildcard or a segment
  // the spec did not specify ('1.2' and '1.2.x' both give [1, 2, null]).
  segments: (number | null)[];
  // How many leading segments are concrete numbers.
  specified: number;
  // Whether the raw body literally ended in a wildcard segment
  // ('1.2.x'), as opposed to a merely missing one ('1.2').
  trailingWildcard: boolean;
  pre: string[] | null;
};

// Parses a comparator body ('1.2.x', '0.300.0-rc.1') into segments and
// prerelease; null when a segment is neither numeric nor a wildcard, or
// a concrete segment follows a wildcard — forms this check does not
// judge.
const parseSpecBody = (body: string): SpecBody | null => {
  const withoutBuild = body.replace(/^[v=]+/, '').split('+')[0] ?? '';
  const dash = withoutBuild.indexOf('-');
  const coreText = dash === -1 ? withoutBuild : withoutBuild.slice(0, dash);
  const rawSegments = coreText.split('.');
  if (rawSegments.length > 3) {
    return null;
  }
  const segments: (number | null)[] = [];
  let specified = 0;
  let sawWildcard = false;
  for (const segment of rawSegments) {
    if (segment === 'x' || segment === 'X' || segment === '*') {
      sawWildcard = true;
      segments.push(null);
    } else if (/^\d+$/.test(segment)) {
      if (sawWildcard) {
        return null;
      }
      specified += 1;
      segments.push(Number(segment));
    } else {
      return null;
    }
  }
  const trailingWildcard =
    rawSegments.length === 3 &&
    (rawSegments[2] === 'x' ||
      rawSegments[2] === 'X' ||
      rawSegments[2] === '*');
  while (segments.length < 3) {
    segments.push(null);
  }
  return {
    segments,
    specified,
    trailingWildcard,
    pre: prereleaseIdentifiers(body),
  };
};

const fillZero = (segments: (number | null)[]): [number, number, number] => [
  segments[0] ?? 0,
  segments[1] ?? 0,
  segments[2] ?? 0,
];

// The core one step past the segment at `index` ('1.2' bumped at the
// minor gives 1.3.0) — the exclusive upper bound of a partial range.
const bumped = (
  segments: (number | null)[],
  index: number,
): [number, number, number] => {
  const core = fillZero(segments);
  core[index] = (core[index] ?? 0) + 1;
  for (let i = index + 1; i < 3; i += 1) {
    core[i] = 0;
  }
  return core;
};

// A token desugars to primitive comparators, 'not-judged' (a form this
// check cannot parse — never a failure), or 'invalid' (a form npm
// itself rejects, e.g. a prerelease on a partial version: it matches
// nothing).
type Desugared = PrimitiveComparator[] | 'not-judged' | 'invalid';

const desugarToken = (token: string): Desugared => {
  const match = /^([~^><=]*)(.+)$/.exec(token);
  const body = match?.[2];
  if (match === null || body === undefined) {
    return 'not-judged';
  }
  const parsed = parseSpecBody(body);
  if (parsed === null) {
    return 'not-judged';
  }
  const op = match[1] ?? '';
  const {segments, specified, pre} = parsed;
  if (pre !== null && specified < 3) {
    // npm rejects prereleases on partial versions ('>=1.2-alpha',
    // '^1.2-beta') — except a trailing-wildcard form like '1.2.x-beta.1',
    // which desugars to the plain x-range with the prerelease dropped.
    const trailingWildcard =
      (op === '' || op === '=') &&
      parsed.trailingWildcard &&
      segments[0] !== null &&
      segments[1] !== null;
    if (!trailingWildcard) {
      return 'invalid';
    }
    return desugarToken(`=${body.slice(0, body.indexOf('-'))}`);
  }
  const filled = fillZero(segments);
  const lower: PrimitiveComparator = {op: '>=', core: filled, pre};
  switch (op) {
    case '':
    case '=':
      if (specified === 0) {
        return [];
      }
      if (specified < 3) {
        return [
          {op: '>=', core: filled, pre: null},
          {op: '<', core: bumped(segments, specified - 1), pre: ['0']},
        ];
      }
      return [{op: '=', core: filled, pre}];
    case '^': {
      if (specified === 0) {
        return [];
      }
      // Bump the first non-zero segment, or the last specified segment
      // when all are zero ('^0.0' -> <0.1.0-0, '^0' -> <1.0.0-0).
      let bumpIndex = specified - 1;
      for (let i = 0; i < specified; i += 1) {
        if ((segments[i] ?? 0) > 0) {
          bumpIndex = i;
          break;
        }
      }
      return [lower, {op: '<', core: bumped(segments, bumpIndex), pre: ['0']}];
    }
    case '~': {
      if (specified === 0) {
        return [];
      }
      const bumpIndex = specified === 1 ? 0 : 1;
      return [lower, {op: '<', core: bumped(segments, bumpIndex), pre: ['0']}];
    }
    case '>':
      return specified < 3
        ? [{op: '>=', core: bumped(segments, specified - 1), pre: null}]
        : [{op: '>', core: filled, pre}];
    case '>=':
      return specified < 3
        ? [{op: '>=', core: filled, pre: null}]
        : [{op: '>=', core: filled, pre}];
    case '<':
      return specified < 3
        ? [{op: '<', core: filled, pre: ['0']}]
        : [{op: '<', core: filled, pre}];
    case '<=':
      return specified < 3
        ? [{op: '<', core: bumped(segments, specified - 1), pre: ['0']}]
        : [{op: '<=', core: filled, pre}];
    default:
      return 'not-judged';
  }
};

// Hyphen ranges ('1.2.3 - 2.0.0') desugar to a lower '>'=' bound and,
// for a partial upper bound, an exclusive bumped bound ('1.2 - 2' ->
// '>=1.2.0 <3.0.0-0'); a full upper bound stays inclusive.
const desugarHyphen = (from: string, to: string): Desugared => {
  const fromParsed = parseSpecBody(from);
  const toParsed = parseSpecBody(to);
  if (fromParsed === null || toParsed === null) {
    return 'not-judged';
  }
  if (
    (fromParsed.pre !== null && fromParsed.specified < 3) ||
    (toParsed.pre !== null && toParsed.specified < 3)
  ) {
    return 'invalid';
  }
  const comparators: PrimitiveComparator[] = [
    {op: '>=', core: fillZero(fromParsed.segments), pre: fromParsed.pre},
  ];
  if (toParsed.specified < 3) {
    if (toParsed.specified > 0) {
      comparators.push({
        op: '<',
        core: bumped(toParsed.segments, toParsed.specified - 1),
        pre: ['0'],
      });
    }
  } else {
    comparators.push({
      op: '<=',
      core: fillZero(toParsed.segments),
      pre: toParsed.pre,
    });
  }
  return comparators;
};

const matchesComparator = (
  versionParts: [number, number, number],
  versionPre: string[] | null,
  comparator: PrimitiveComparator,
): boolean => {
  const cmp = compareFull(
    versionParts,
    versionPre,
    comparator.core,
    comparator.pre,
  );
  switch (comparator.op) {
    case '<':
      return cmp < 0;
    case '<=':
      return cmp <= 0;
    case '>':
      return cmp > 0;
    case '>=':
      return cmp >= 0;
    case '=':
      return cmp === 0;
  }
};

// One OR alternative: a space-separated AND set of comparators (with at
// most one hyphen range). 'not-judged' propagates: a set containing a
// form this check cannot parse is not this check's to judge.
const satisfiesAlternative = (
  versionParts: [number, number, number],
  versionPre: string[] | null,
  alternative: string,
): boolean | 'not-judged' => {
  const tokens = alternative.trim().split(/\s+/).filter(Boolean);
  const comparators: PrimitiveComparator[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] ?? '';
    if (token === '-' && i > 0 && i < tokens.length - 1) {
      continue;
    }
    const previous = tokens[i - 1];
    const next = tokens[i + 1];
    const desugared =
      next === '-'
        ? desugarHyphen(token, tokens[i + 2] ?? '')
        : previous === '-'
          ? []
          : desugarToken(token);
    if (desugared === 'not-judged') {
      return 'not-judged';
    }
    if (desugared === 'invalid') {
      return false;
    }
    comparators.push(...desugared);
  }
  if (!comparators.every(c => matchesComparator(versionParts, versionPre, c))) {
    return false;
  }
  // npm's prerelease gate: a prerelease version satisfies a set only
  // when some comparator in it carries a prerelease with the same core
  // version — '^1.2.0' does not admit '1.2.3-beta.1', while
  // '^1.2.3-beta.1' admits '1.2.3-beta.2' but not '1.2.4-beta.1'.
  if (versionPre === null) {
    return true;
  }
  return comparators.some(
    c =>
      c.pre !== null &&
      c.core[0] === versionParts[0] &&
      c.core[1] === versionParts[1] &&
      c.core[2] === versionParts[2],
  );
};

// npm-compatible satisfaction for registry specs: '*', exact, caret,
// tilde, comparators, partial and wildcard forms ('1.2', '1.2.x'),
// hyphen ranges, space-separated AND sets, and '||' OR sets. Forms
// this check cannot parse (dist-tags like 'beta', non-version text)
// are not judged and report satisfied — the caller filters
// non-registry specs, and a lockfile desync must never hide behind a
// parser gap for the forms above, which are judged exactly.
export const versionSatisfiesSpec = (
  version: string,
  spec: string,
): boolean => {
  const trimmed = spec.trim();
  if (trimmed === 'latest') {
    return true;
  }
  const rawParts = parseVersionParts(version);
  if (rawParts === null) {
    return true;
  }
  const versionParts: [number, number, number] = [
    rawParts[0] ?? 0,
    rawParts[1] ?? 0,
    rawParts[2] ?? 0,
  ];
  const versionPre = prereleaseIdentifiers(version);
  if (trimmed === '' || trimmed === '*' || trimmed === 'x' || trimmed === 'X') {
    // The any-range admits releases only; npm never resolves it to a
    // prerelease.
    return versionPre === null;
  }
  let sawNotJudged = false;
  for (const alternative of trimmed.split('||')) {
    const result = satisfiesAlternative(versionParts, versionPre, alternative);
    if (result === true) {
      return true;
    }
    if (result === 'not-judged') {
      sawNotJudged = true;
    }
  }
  return sawNotJudged;
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
