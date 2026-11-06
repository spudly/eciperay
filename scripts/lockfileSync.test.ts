import {join} from 'node:path';

import {
  aliasSpecRange,
  findLockfileDependencyMismatches,
  formatLockfileDependencyMismatches,
  parseVersionParts,
  prereleaseIdentifiers,
  resolutionCandidates,
  versionSatisfiesSpec,
} from './lockfileSync.ts';

describe('parseVersionParts', () => {
  test('parses full and partial versions', () => {
    expect(parseVersionParts('1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersionParts('v1.2')).toEqual([1, 2, null]);
    expect(parseVersionParts('=0.300.0')).toEqual([0, 300, 0]);
  });

  test('treats wildcards as unspecified segments', () => {
    expect(parseVersionParts('1.x')).toEqual([1, null, null]);
    expect(parseVersionParts('2.*.4')).toEqual([2, null, 4]);
  });

  test('ignores prerelease and build suffixes', () => {
    expect(parseVersionParts('1.2.3-beta.1+build5')).toEqual([1, 2, 3]);
  });

  test('returns null for non-numeric segments', () => {
    expect(parseVersionParts('next')).toBeNull();
    expect(parseVersionParts('1.two.3')).toBeNull();
  });
});

describe('versionSatisfiesSpec', () => {
  test('accepts any version for wildcard specs', () => {
    expect(versionSatisfiesSpec('9.9.9', '*')).toBe(true);
    expect(versionSatisfiesSpec('9.9.9', '')).toBe(true);
    expect(versionSatisfiesSpec('9.9.9', 'latest')).toBe(true);
  });

  test('exact specs require every specified segment to match', () => {
    expect(versionSatisfiesSpec('19.3.1', '19.3.1')).toBe(true);
    expect(versionSatisfiesSpec('19.3.0', '19.3.1')).toBe(false);
    expect(versionSatisfiesSpec('19.3.1', '=19.3.1')).toBe(true);
    expect(versionSatisfiesSpec('19.9.9', '19.x')).toBe(true);
    expect(versionSatisfiesSpec('20.0.0', '19.x')).toBe(false);
  });

  test('caret specs stay within the leftmost non-zero segment', () => {
    expect(versionSatisfiesSpec('5.57.0', '^5.57.0')).toBe(true);
    expect(versionSatisfiesSpec('5.56.1', '^5.57.0')).toBe(false);
    expect(versionSatisfiesSpec('6.0.0', '^5.57.0')).toBe(false);
    expect(versionSatisfiesSpec('0.2.39', '^0.2.39')).toBe(true);
    expect(versionSatisfiesSpec('0.3.0', '^0.2.39')).toBe(false);
    expect(versionSatisfiesSpec('0.0.3', '^0.0.3')).toBe(true);
    expect(versionSatisfiesSpec('0.0.4', '^0.0.3')).toBe(false);
  });

  test('tilde specs stay within the minor segment', () => {
    expect(versionSatisfiesSpec('58.0.17', '~58.0.16')).toBe(true);
    expect(versionSatisfiesSpec('58.1.0', '~58.0.16')).toBe(false);
    expect(versionSatisfiesSpec('58.0.15', '~58.0.16')).toBe(false);
  });

  test('comparator specs compare against the spec version', () => {
    expect(versionSatisfiesSpec('2.0.0', '>=1.0.0')).toBe(true);
    expect(versionSatisfiesSpec('0.9.0', '>=1.0.0')).toBe(false);
    expect(versionSatisfiesSpec('1.0.0', '<=1.0.0')).toBe(true);
    expect(versionSatisfiesSpec('1.0.1', '<=1.0.0')).toBe(false);
    expect(versionSatisfiesSpec('1.0.1', '>1.0.0')).toBe(true);
    expect(versionSatisfiesSpec('1.0.0', '>1.0.0')).toBe(false);
    expect(versionSatisfiesSpec('0.9.9', '<1.0.0')).toBe(true);
    expect(versionSatisfiesSpec('1.0.0', '<1.0.0')).toBe(false);
  });

  test('supports AND and OR spec sets', () => {
    expect(versionSatisfiesSpec('1.5.0', '>=1.0.0 <2.0.0')).toBe(true);
    expect(versionSatisfiesSpec('2.5.0', '>=1.0.0 <2.0.0')).toBe(false);
    expect(versionSatisfiesSpec('2.5.0', '^1.0.0 || ^2.0.0')).toBe(true);
    expect(versionSatisfiesSpec('3.0.0', '^1.0.0 || ^2.0.0')).toBe(false);
  });

  test('does not judge specs or versions it cannot parse', () => {
    expect(versionSatisfiesSpec('1.0.0', 'not-a-version')).toBe(true);
    expect(versionSatisfiesSpec('not-a-version', '^1.0.0')).toBe(true);
  });
});

describe('prereleaseIdentifiers', () => {
  test('extracts dot-separated identifiers, ignoring build metadata', () => {
    expect(prereleaseIdentifiers('1.2.3-beta.1+build5')).toEqual(['beta', '1']);
    expect(prereleaseIdentifiers('1.2.3-alpha')).toEqual(['alpha']);
    expect(prereleaseIdentifiers('=0.300.0-rc.1')).toEqual(['rc', '1']);
  });

  test('returns null when there is no prerelease', () => {
    expect(prereleaseIdentifiers('1.2.3')).toBeNull();
    expect(prereleaseIdentifiers('1.2.3+build5')).toBeNull();
  });
});

describe('versionSatisfiesSpec prerelease rules (npm semantics)', () => {
  test('rejects prerelease versions the spec does not accept', () => {
    expect(versionSatisfiesSpec('1.2.3-beta.1', '^1.2.0')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '~1.2.0')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '1.2.3')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '>=1.0.0')).toBe(false);
    expect(versionSatisfiesSpec('5.63.0-beta.1', '^5.57.0')).toBe(false);
  });

  test('a release does not satisfy a prerelease spec', () => {
    expect(versionSatisfiesSpec('1.2.3', '1.2.3-beta.1')).toBe(false);
    expect(versionSatisfiesSpec('1.2.4', '^1.2.3-beta.1')).toBe(true);
  });

  test('accepts prereleases within the tuple the spec names', () => {
    expect(versionSatisfiesSpec('1.2.3-beta.1', '1.2.3-beta.1')).toBe(true);
    expect(versionSatisfiesSpec('1.2.3-beta.2', '^1.2.3-beta.1')).toBe(true);
    expect(versionSatisfiesSpec('1.2.3-beta.2', '~1.2.3-beta.1')).toBe(true);
    expect(versionSatisfiesSpec('1.2.3-alpha', '^1.2.3-beta.1')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-rc.1', '>=1.2.3-alpha <2.0.0')).toBe(
      true,
    );
  });

  test('gates prereleases of other tuples out of the set', () => {
    expect(versionSatisfiesSpec('1.2.4-beta.1', '^1.2.3-beta.1')).toBe(false);
    expect(versionSatisfiesSpec('2.0.0-beta.1', '>=1.2.3-alpha <2.0.0')).toBe(
      false,
    );
  });

  test('build metadata never affects satisfaction', () => {
    expect(versionSatisfiesSpec('1.2.3+build5', '^1.2.0')).toBe(true);
    expect(versionSatisfiesSpec('1.2.3-beta.1+build5', '^1.2.3-beta.1')).toBe(
      true,
    );
  });
});

describe('versionSatisfiesSpec wildcards, partials, and hyphen ranges', () => {
  test('wildcard and partial specs desugar to bounded ranges', () => {
    expect(versionSatisfiesSpec('1.2.3', '1.2.x')).toBe(true);
    expect(versionSatisfiesSpec('1.3.0', '1.2.x')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3', '1.2')).toBe(true);
    expect(versionSatisfiesSpec('1.2.3', '1')).toBe(true);
    expect(versionSatisfiesSpec('2.0.0', '1')).toBe(false);
    expect(versionSatisfiesSpec('0.0.3', '0.0.x')).toBe(true);
    expect(versionSatisfiesSpec('0.1.0', '0.0.x')).toBe(false);
    expect(versionSatisfiesSpec('1.9.9', '~1')).toBe(true);
    expect(versionSatisfiesSpec('1.9.9', '~1.x')).toBe(true);
    expect(versionSatisfiesSpec('1.9.9', '^1.2')).toBe(true);
  });

  test('partial comparators bound the whole partial range', () => {
    expect(versionSatisfiesSpec('1.2.3', '>1.2')).toBe(false);
    expect(versionSatisfiesSpec('1.3.0', '>1.2')).toBe(true);
    expect(versionSatisfiesSpec('1.2.3', '<=1.2')).toBe(true);
    expect(versionSatisfiesSpec('1.3.0', '<=1.2')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3', '>1')).toBe(false);
    expect(versionSatisfiesSpec('2.0.0', '>1')).toBe(true);
    expect(versionSatisfiesSpec('2.9.9', '<=2')).toBe(true);
    expect(versionSatisfiesSpec('3.0.0', '<=2')).toBe(false);
    expect(versionSatisfiesSpec('1.2.0', '>=1.2')).toBe(true);
    expect(versionSatisfiesSpec('1.1.9', '<1.2')).toBe(true);
  });

  test('prereleases against wildcard and partial specs follow npm', () => {
    expect(versionSatisfiesSpec('1.2.3-beta.1', '*')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '1.2.x')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '1.x')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '>=1.2')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '>1.2')).toBe(false);
    // A wildcard spec carrying a prerelease drops it (npm desugars
    // '1.2.x-beta.1' to the plain x-range).
    expect(versionSatisfiesSpec('1.2.3', '1.2.x-beta.1')).toBe(true);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '1.2.x-beta.1')).toBe(false);
    // A prerelease on a partial version is an invalid range in npm:
    // it matches nothing, not even its own tuple.
    expect(versionSatisfiesSpec('1.2.0', '>=1.2-alpha')).toBe(false);
    expect(versionSatisfiesSpec('1.2.0-alpha.1', '>=1.2-alpha')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3', '1.2-alpha')).toBe(false);
  });

  test('hyphen ranges are inclusive at both ends', () => {
    expect(versionSatisfiesSpec('1.2.3', '1.2.3 - 2.0.0')).toBe(true);
    expect(versionSatisfiesSpec('2.0.0', '1.2.3 - 2.0.0')).toBe(true);
    expect(versionSatisfiesSpec('2.0.1', '1.2.3 - 2.0.0')).toBe(false);
    expect(versionSatisfiesSpec('1.2.2', '1.2.3 - 2.0.0')).toBe(false);
    expect(versionSatisfiesSpec('2.9.9', '1.2 - 2')).toBe(true);
    expect(versionSatisfiesSpec('3.0.0', '1.2 - 2')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3-beta.2', '1.2.3-beta.1 - 2.0.0')).toBe(
      true,
    );
    expect(versionSatisfiesSpec('1.2.4-beta.1', '1.2.3-beta.1 - 2.0.0')).toBe(
      false,
    );
  });
});

describe('versionSatisfiesSpec operator whitespace (npm trims it)', () => {
  test('a spaced operator still binds its version', () => {
    expect(versionSatisfiesSpec('1.0.0', '>= 2.0.0')).toBe(false);
    expect(versionSatisfiesSpec('2.0.0', '>= 2.0.0')).toBe(true);
    expect(versionSatisfiesSpec('1.0.0', '< 2.0.0')).toBe(true);
    expect(versionSatisfiesSpec('2.0.0', '<= 1.2.3')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3', '= 1.2.3')).toBe(true);
    expect(versionSatisfiesSpec('1.2.3', '^ 1.2.0')).toBe(true);
    expect(versionSatisfiesSpec('2.0.0', '^ 1.2.0')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3', '~ 1.2')).toBe(true);
    expect(versionSatisfiesSpec('1.3.0', '~ 1.2')).toBe(false);
    expect(versionSatisfiesSpec('1.2.3', '> 1.2')).toBe(false);
    expect(versionSatisfiesSpec('1.5.0', '> 1.2')).toBe(true);
    expect(versionSatisfiesSpec('1.5.0', '>= 1.2.3 < 2.0.0')).toBe(true);
    expect(versionSatisfiesSpec('1.2.3-beta.1', '>= 1.2.3-alpha')).toBe(true);
  });
});

describe('aliasSpecRange', () => {
  test('extracts the range from alias specs, including scoped targets', () => {
    expect(aliasSpecRange('npm:react@^18.2.0')).toBe('^18.2.0');
    expect(aliasSpecRange('npm:@scope/ui@1.2.3')).toBe('1.2.3');
    expect(aliasSpecRange('npm:react@beta')).toBe('beta');
  });

  test('returns null for non-alias specs and aliases without a range', () => {
    expect(aliasSpecRange('^18.2.0')).toBeNull();
    expect(aliasSpecRange('npm:react')).toBeNull();
    expect(aliasSpecRange('npm:@scope/ui')).toBeNull();
  });
});

describe('resolutionCandidates', () => {
  test('walks from the workspace up to the repo root', () => {
    expect(resolutionCandidates('packages/server', 'posthog-node')).toEqual([
      'packages/server/node_modules/posthog-node',
      'packages/node_modules/posthog-node',
      'node_modules/posthog-node',
    ]);
    expect(resolutionCandidates('', 'typescript')).toEqual([
      'node_modules/typescript',
    ]);
  });
});

const fakeFs = (files: Record<string, unknown>) => ({
  readFileSync: (path: string) => {
    const key = Object.keys(files)
      .filter(suffix => path.endsWith(suffix))
      .sort((a, b) => b.length - a.length)[0];
    if (key === undefined) {
      throw new Error(`unexpected read: ${path}`);
    }
    return JSON.stringify(files[key]);
  },
});

describe('findLockfileDependencyMismatches', () => {
  test('flags a stale nested entry and a missing entry', () => {
    const fs = fakeFs({
      'package.json': {
        workspaces: ['packages/server'],
        devDependencies: {typescript: '^7.0.2', gone: '^1.0.0'},
      },
      'packages/server/package.json': {
        dependencies: {'posthog-node': '^5.57.0', 'local': 'file:../local'},
      },
      'package-lock.json': {
        packages: {
          'node_modules/typescript': {version: '7.0.2'},
          'packages/server/node_modules/posthog-node': {version: '5.56.1'},
        },
      },
    });
    expect(findLockfileDependencyMismatches('/repo', fs as never)).toEqual([
      {
        workspace: '',
        dependency: 'gone',
        spec: '^1.0.0',
        lockfileVersion: undefined,
      },
      {
        workspace: 'packages/server',
        dependency: 'posthog-node',
        spec: '^5.57.0',
        lockfileVersion: '5.56.1',
      },
    ]);
  });

  test('accepts hoisted resolutions and skips linked workspace entries', () => {
    const fs = fakeFs({
      'package.json': {workspaces: ['packages/web']},
      'packages/web/package.json': {
        dependencies: {'@eciperay/types': '*', 'react': '^19.3.0'},
        optionalDependencies: {fsevents: '~2.3.0'},
      },
      'package-lock.json': {
        packages: {
          'node_modules/@eciperay/types': {link: true},
          'node_modules/react': {version: '19.3.1'},
          'node_modules/fsevents': {version: '2.3.3'},
        },
      },
    });
    expect(findLockfileDependencyMismatches('/repo', fs as never)).toEqual([]);
  });

  test('judges alias specs against the embedded range, resolved under the alias name', () => {
    const fs = fakeFs({
      'package.json': {
        workspaces: ['packages/web'],
        dependencies: {
          'react-legacy': 'npm:react@^18.2.0',
          'ui': 'npm:@scope/ui@1.2.3',
          'anything': 'npm:react@beta',
        },
      },
      'packages/web/package.json': {
        dependencies: {'react-next': 'npm:react@^19.0.0'},
      },
      'package-lock.json': {
        packages: {
          'node_modules/react-legacy': {version: '17.0.2'},
          'node_modules/ui': {version: '1.2.3'},
          'node_modules/anything': {version: '0.0.1'},
          'packages/web/node_modules/react-next': {version: '19.3.1'},
        },
      },
    });
    // react-legacy resolves 17.0.2 against the alias range ^18.2.0: a
    // mismatch reported with the original alias spec. The exact scoped
    // alias and the in-range nested alias pass; the dist-tag alias is
    // not judged, like a bare dist-tag spec.
    expect(findLockfileDependencyMismatches('/repo', fs as never)).toEqual([
      {
        workspace: '',
        dependency: 'react-legacy',
        spec: 'npm:react@^18.2.0',
        lockfileVersion: '17.0.2',
      },
    ]);
  });

  test('flags a prerelease resolution under a release-only spec', () => {
    const fs = fakeFs({
      'package.json': {workspaces: ['packages/server']},
      'packages/server/package.json': {
        dependencies: {'posthog-node': '^5.57.0'},
      },
      'package-lock.json': {
        packages: {
          'packages/server/node_modules/posthog-node': {
            version: '5.63.0-beta.1',
          },
        },
      },
    });
    expect(findLockfileDependencyMismatches('/repo', fs as never)).toEqual([
      {
        workspace: 'packages/server',
        dependency: 'posthog-node',
        spec: '^5.57.0',
        lockfileVersion: '5.63.0-beta.1',
      },
    ]);
  });

  test('handles a manifest without workspaces and a lockfile without packages', () => {
    const fs = fakeFs({
      'package.json': {dependencies: {react: '^19.3.0'}},
      'package-lock.json': {},
    });
    expect(findLockfileDependencyMismatches('/repo', fs as never)).toEqual([
      {
        workspace: '',
        dependency: 'react',
        spec: '^19.3.0',
        lockfileVersion: undefined,
      },
    ]);
  });

  test('the real repo lockfile satisfies every workspace manifest', () => {
    const root = join(import.meta.dirname, '..');
    expect(findLockfileDependencyMismatches(root)).toEqual([]);
  });
});

describe('formatLockfileDependencyMismatches', () => {
  test('renders workspace, dependency, spec, and locked version', () => {
    expect(
      formatLockfileDependencyMismatches([
        {
          workspace: 'packages/server',
          dependency: 'posthog-node',
          spec: '^5.57.0',
          lockfileVersion: '5.56.1',
        },
        {
          workspace: '',
          dependency: 'gone',
          spec: '^1.0.0',
          lockfileVersion: undefined,
        },
      ]),
    ).toBe(
      '  packages/server: posthog-node spec ^5.57.0, lockfile has 5.56.1\n' +
        '  (root): gone spec ^1.0.0, lockfile has (missing)',
    );
  });
});
