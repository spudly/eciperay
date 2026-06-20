import {appendFileSync} from 'node:fs';

export type DeployTarget = 'fly' | 'android';

export type DeployTargets = {fly: boolean; android: boolean};

export const ALLOWED_SCOPES = [
  'app',
  'web',
  'server',
  'client',
  'types',
  'theme',
  'android',
  'deps',
  'ci',
  'release',
] as const;

export type PackageName =
  | 'app'
  | 'web'
  | 'server'
  | 'client'
  | 'types'
  | 'theme';

export const SCOPE_TO_PACKAGE: Record<string, PackageName | null> = {
  app: 'app',
  android: 'app',
  web: 'web',
  server: 'server',
  client: 'client',
  types: 'types',
  theme: 'theme',
  deps: null,
  ci: null,
  release: null,
};

export const PACKAGE_DEPENDENTS: Record<PackageName, PackageName[]> = {
  types: ['client', 'server', 'web', 'app'],
  theme: ['web', 'app'],
  client: ['server', 'web', 'app'],
  server: [],
  web: [],
  app: [],
};

export const PACKAGE_DEPLOY_TARGETS: Record<PackageName, DeployTarget[]> = {
  server: ['fly'],
  web: ['fly'],
  app: ['android'],
  client: ['fly', 'android'],
  types: [],
  theme: [],
};

export const parseCommitScopes = (subject: string): string[] => {
  const match = /^(\w+)(?:\(([^)]+)\))?!?:/u.exec(subject.trim());
  if (!match?.[2]) {
    return [];
  }

  return match[2]
    .split(',')
    .map(scope => scope.trim())
    .filter(Boolean);
};

export const scopeToPackage = (scope: string): PackageName | null => {
  return SCOPE_TO_PACKAGE[scope] ?? null;
};

export const expandAffectedPackages = (
  seedPackages: Iterable<PackageName>,
): Set<PackageName> => {
  const affected = new Set<PackageName>();
  const queue = [...seedPackages];

  while (queue.length > 0) {
    const pkg = queue.pop();
    if (!pkg || affected.has(pkg)) {
      continue;
    }

    affected.add(pkg);
    for (const dependent of PACKAGE_DEPENDENTS[pkg]) {
      if (!affected.has(dependent)) {
        queue.push(dependent);
      }
    }
  }

  return affected;
};

export const packagesToDeployTargets = (
  packages: Iterable<PackageName>,
): DeployTargets => {
  const targets: DeployTargets = {fly: false, android: false};

  for (const pkg of packages) {
    for (const target of PACKAGE_DEPLOY_TARGETS[pkg]) {
      targets[target] = true;
    }
  }

  return targets;
};

export const resolveDeployTargetsFromSubjects = (
  subjects: string[],
): DeployTargets => {
  const seedPackages = new Set<PackageName>();

  for (const subject of subjects) {
    if (subject.startsWith('chore(release):')) {
      continue;
    }

    for (const scope of parseCommitScopes(subject)) {
      const pkg = scopeToPackage(scope);
      if (pkg) {
        seedPackages.add(pkg);
      }
    }
  }

  const affected = expandAffectedPackages(seedPackages);
  return packagesToDeployTargets(affected);
};

export const formatGithubOutput = (targets: DeployTargets): string =>
  `deploy_fly=${targets.fly}\ndeploy_android=${targets.android}\n`;

export const writeGithubOutput = (
  targets: DeployTargets,
  outputPath: string | undefined,
  append: typeof appendFileSync,
): void => {
  const body = formatGithubOutput(targets);
  if (outputPath) {
    append(outputPath, body);
    return;
  }
  process.stdout.write(body);
};
