import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

import {
  getChangedFiles,
  resolveBase,
  writeOutput,
  createDefaultExecDeps,
  type ExecDeps,
} from './affectedFiles.ts';

/**
 * Change-scoped spec selection for the Playwright e2e suites (issue #439).
 *
 * The e2e workflow used to run both suites in full on every PR that touched
 * packages/web, packages/client, or the lockfile. This selector maps the PR's
 * changed files to the specs that cover them, per suite:
 *
 * - A changed file inside a suite's directory selects that whole suite (specs,
 *   fixtures, and helpers are shared within a suite).
 * - A changed file matching an area mapping selects that area's specs.
 * - Shared web plumbing (entry point, router, app shell) and suite-wide plumbing
 *   (Playwright configs, web package manifest, this selector) select both
 *   suites in full.
 * - Anything else under packages/web, packages/client, or packages/server that
 *   matches no mapping selects BOTH suites in full (fail-open: a mapping gap
 *   costs time, never coverage).
 * - Files outside those trees (docs, other packages, root config that the
 *   workflow's path filter does not trigger on) select nothing.
 *
 * Full runs stay available: workflow_dispatch and the weekly schedule run with
 * --all semantics (see runSelectE2eSpecsCli), so a mapping gap also surfaces as
 * a scheduled failure instead of a silent miss.
 */

export type SuiteSelection = {
  /** Spec paths relative to packages/web, or 'all' for the full suite. */
  mocked: string[] | 'all';
  live: string[] | 'all';
};

export const MOCKED_SPECS = [
  'e2e/meal-plans.spec.ts',
  'e2e/mobile-web.spec.ts',
  'e2e/profile.spec.ts',
  'e2e/recipes.spec.ts',
  'e2e/signed-out.spec.ts',
] as const;

export const LIVE_SPECS = [
  'e2e-live/auth.spec.ts',
  'e2e-live/cook-log.spec.ts',
  'e2e-live/imports.spec.ts',
  'e2e-live/meal-plans.spec.ts',
  'e2e-live/public.spec.ts',
  'e2e-live/recipes.spec.ts',
  'e2e-live/sharing.spec.ts',
  'e2e-live/sign-out.spec.ts',
] as const;

type AreaMapping = {
  /** Path globs (`**` crosses directories, `*` stays within one segment). */
  patterns: string[];
  mocked: string[];
  live: string[];
};

const AREA_MAPPINGS: AreaMapping[] = [
  {
    // Auth pages/components and the client/server auth surface. The live
    // auth spec is the one that used to send a real password-reset email
    // on every run (issue #438); scoping means it runs only when
    // auth-adjacent code changes.
    patterns: [
      'packages/web/src/pages/auth/**',
      'packages/web/src/components/AuthProvider*',
      'packages/web/src/lib/authApi*',
      'packages/web/src/lib/authDeepLink*',
      'packages/client/src/**/auth*',
      'packages/server/src/**/auth*',
    ],
    mocked: ['e2e/signed-out.spec.ts'],
    live: [
      'e2e-live/auth.spec.ts',
      'e2e-live/public.spec.ts',
      'e2e-live/sign-out.spec.ts',
    ],
  },
  {
    patterns: [
      'packages/web/src/pages/recipes/**',
      'packages/web/src/pages/*RecipePage*',
      'packages/web/src/pages/DiscoverPage*',
      'packages/web/src/pages/EditVersionPage*',
      'packages/client/src/**/recipe*',
      'packages/server/src/**/recipe*',
    ],
    mocked: ['e2e/recipes.spec.ts', 'e2e/mobile-web.spec.ts'],
    live: ['e2e-live/recipes.spec.ts'],
  },
  {
    // Discover is exercised by the signed-out specs, not the recipes specs:
    // the mocked signed-out spec covers its rendering and pagination, and
    // the live public spec covers its render against the QA dataset. This
    // mapping unions with the recipes mapping above (DiscoverPage also
    // matches it), so a Discover change runs both sets.
    patterns: ['packages/web/src/pages/DiscoverPage*'],
    mocked: ['e2e/signed-out.spec.ts'],
    live: ['e2e-live/public.spec.ts'],
  },
  {
    patterns: [
      'packages/web/src/pages/mealPlans/**',
      'packages/web/src/pages/MealPlan*Page*',
      'packages/web/src/pages/meals/**',
      'packages/web/src/pages/Meal*Page*',
      'packages/web/src/pages/CookingModePage*',
      'packages/web/src/pages/cooks/**',
      'packages/client/src/**/meal*',
      'packages/server/src/**/meal*',
      'packages/server/src/**/cook*',
    ],
    mocked: ['e2e/meal-plans.spec.ts', 'e2e/mobile-web.spec.ts'],
    live: ['e2e-live/meal-plans.spec.ts', 'e2e-live/cook-log.spec.ts'],
  },
  {
    patterns: [
      'packages/web/src/pages/import/**',
      'packages/web/src/pages/Import*Page*',
      'packages/client/src/**/import*',
      'packages/server/src/**/import*',
    ],
    mocked: [],
    live: ['e2e-live/imports.spec.ts'],
  },
  {
    patterns: [
      'packages/web/src/pages/public/**',
      'packages/web/src/pages/MarketingLandingPage*',
      'packages/web/src/pages/PrivacyPolicyPage*',
      'packages/web/src/pages/seo/**',
      'packages/client/src/**/sharing*',
      'packages/server/src/**/sharing*',
    ],
    mocked: ['e2e/signed-out.spec.ts'],
    live: ['e2e-live/public.spec.ts', 'e2e-live/sharing.spec.ts'],
  },
  {
    patterns: [
      'packages/web/src/pages/account/**',
      'packages/web/src/pages/ProfilePage*',
      'packages/web/src/pages/ConsentPreferencesPage*',
      'packages/web/src/pages/billing/**',
      'packages/web/src/pages/PayPage*',
      'packages/client/src/**/account*',
      'packages/client/src/**/profile*',
      'packages/server/src/**/account*',
      'packages/server/src/**/billing*',
    ],
    mocked: ['e2e/profile.spec.ts'],
    live: [],
  },
  {
    patterns: [
      'packages/web/src/pages/tags/**',
      'packages/web/src/pages/AddPage*',
      'packages/web/src/pages/ManualEntryPage*',
      'packages/web/src/pages/ai/**',
      'packages/web/src/pages/AiSessionHost*',
      'packages/web/src/pages/GenerateAiPage*',
      'packages/client/src/**/tag*',
      'packages/server/src/**/tag*',
      'packages/server/src/**/ai*',
    ],
    mocked: ['e2e/recipes.spec.ts'],
    live: ['e2e-live/recipes.spec.ts', 'e2e-live/imports.spec.ts'],
  },
];

/** Files that select both suites in full when changed. */
const FULL_BOTH_PATTERNS = [
  'package.json',
  'package-lock.json',
  '.github/workflows/e2e.yml',
  'scripts/selectE2eSpecs.ts',
  'scripts/selectE2eSpecs.test.ts',
  'scripts/affectedFiles.ts',
  'packages/web/package.json',
  'packages/web/playwright.config.ts',
  'packages/web/playwright.live.config.ts',
  'packages/web/src/main.tsx',
  'packages/web/src/index.css',
  'packages/web/src/routes/**',
  'packages/web/src/components/**',
  'packages/web/index.html',
  'packages/web/vite.config.*',
];

/** Trees whose unmapped files fail open to both full suites. */
const FAIL_OPEN_PREFIXES = [
  'packages/web/',
  'packages/client/',
  'packages/server/',
];

const globToRegExp = (glob: string): RegExp => {
  const escaped = glob
    .split('**')
    .map(part =>
      part
        .split('*')
        .map(segment => segment.replace(/[.+^${}()|[\]\\]/gu, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*');
  return new RegExp(`^${escaped}$`, 'u');
};

const matchesAny = (file: string, patterns: string[]): boolean =>
  patterns.some(pattern => globToRegExp(pattern).test(file));

const isTestOnlyFile = (file: string): boolean =>
  /\.test\.(ts|tsx)$/u.test(file) || file.includes('/test/');

export const selectE2eSpecs = (changedFiles: string[]): SuiteSelection => {
  const mocked = new Set<string>();
  const live = new Set<string>();
  let mockedAll = false;
  let liveAll = false;

  for (const file of changedFiles) {
    if (file.endsWith('.md')) {
      continue;
    }
    if (file.startsWith('packages/web/e2e-live/')) {
      liveAll = true;
      continue;
    }
    if (file.startsWith('packages/web/e2e/')) {
      mockedAll = true;
      continue;
    }
    if (matchesAny(file, FULL_BOTH_PATTERNS)) {
      mockedAll = true;
      liveAll = true;
      continue;
    }
    // Unit/component test files never change e2e behavior on their own.
    if (isTestOnlyFile(file)) {
      continue;
    }
    let mapped = false;
    for (const area of AREA_MAPPINGS) {
      if (matchesAny(file, area.patterns)) {
        mapped = true;
        area.mocked.forEach(spec => mocked.add(spec));
        area.live.forEach(spec => live.add(spec));
      }
    }
    if (!mapped && FAIL_OPEN_PREFIXES.some(prefix => file.startsWith(prefix))) {
      mockedAll = true;
      liveAll = true;
    }
  }

  return {
    mocked: mockedAll ? 'all' : [...mocked].sort(),
    live: liveAll ? 'all' : [...live].sort(),
  };
};

/**
 * GitHub Actions outputs: `mocked-specs` / `live-specs` hold the spec args for
 * `playwright test` (empty = skip the suite), and `mocked-run` / `live-run` are
 * 'true' when the suite has anything to run. A full suite is an empty arg list
 * with run=true (playwright runs its whole testDir).
 */
export const formatGithubOutput = (selection: SuiteSelection): string => {
  const lines: string[] = [];
  const suites = [
    ['mocked', selection.mocked],
    ['live', selection.live],
  ] as const;
  for (const [name, specs] of suites) {
    if (specs === 'all') {
      lines.push(`${name}-specs=`, `${name}-run=true`);
    } else if (specs.length > 0) {
      lines.push(`${name}-specs=${specs.join(' ')}`, `${name}-run=true`);
    } else {
      lines.push(`${name}-specs=`, `${name}-run=false`);
    }
  }
  return `${lines.join('\n')}\n`;
};

export const runSelectE2eSpecsCli = (
  deps: ExecDeps = createDefaultExecDeps(),
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): void => {
  const root = join(new URL('..', import.meta.url).pathname);
  const {base, all} = resolveBase(argv, env);
  // Non-PR events (workflow_dispatch, schedule, local runs without a base)
  // resolve to the full suites — coverage can never silently drop.
  const selection: SuiteSelection =
    all || !base
      ? {mocked: 'all', live: 'all'}
      : selectE2eSpecs(getChangedFiles(root, base, deps.execSync));
  writeOutput(formatGithubOutput(selection));
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

export const maybeRunSelectE2eSpecsCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = runSelectE2eSpecsCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunSelectE2eSpecsCli();
