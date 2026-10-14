import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  getChangedFiles,
  isAllAffectingRootFile,
  isIgnoredFile,
  isScriptsAffectingFile,
  resolveBase,
  workspaceForFile,
  writeOutput,
  createDefaultExecDeps,
  type ExecDeps,
} from './affectedFiles.ts';
import {
  buildDependentsGraph,
  expandDependents,
  readWorkspaceNameMap,
} from './affectedGraph.ts';
import {
  discoverWorkspacePackages,
  type DiscoverFs,
} from './discoverWorkspacePackages.ts';

export type AffectedResult = {
  testPackages: string[];
  lintPackages: string[];
  runScriptsTests: boolean;
};

const directlyAffectedWorkspaces = (
  changedFiles: string[],
  workspaces: string[],
): Set<string> => {
  const direct = new Set<string>();
  for (const file of changedFiles) {
    if (isIgnoredFile(file) || isScriptsAffectingFile(file)) {
      continue;
    }
    const ws = workspaceForFile(file);
    if (ws && workspaces.includes(ws)) {
      direct.add(ws);
    }
  }
  return direct;
};

export const discoverAffectedPackages = (
  root: string,
  workspaces: string[],
  changedFiles: string[],
  fs: DiscoverFs,
): AffectedResult => {
  const {testPackages: allTest, lintPackages: allLint} =
    discoverWorkspacePackages(root, workspaces, fs);

  if (changedFiles.some(isAllAffectingRootFile)) {
    return {
      testPackages: allTest,
      lintPackages: allLint,
      runScriptsTests: true,
    };
  }

  const direct = directlyAffectedWorkspaces(changedFiles, workspaces);
  const nameToDir = readWorkspaceNameMap(root, workspaces, fs.readFileSync);
  const dependents = buildDependentsGraph(
    root,
    workspaces,
    nameToDir,
    fs.readFileSync,
  );
  const affected = expandDependents(direct, dependents);

  return {
    testPackages: allTest.filter(pkg => affected.has(pkg)),
    lintPackages: allLint.filter(pkg => affected.has(pkg)),
    runScriptsTests: changedFiles.some(isScriptsAffectingFile),
  };
};

export const formatGithubOutput = (result: AffectedResult): string =>
  `test-packages=${JSON.stringify(result.testPackages)}\n` +
  `lint-packages=${JSON.stringify(result.lintPackages)}\n` +
  `run-scripts-tests=${result.runScriptsTests}\n`;

const fullMatrixResult = (
  root: string,
  workspaces: string[],
  fs: DiscoverFs,
): AffectedResult => {
  const full = discoverWorkspacePackages(root, workspaces, fs);
  return {
    testPackages: full.testPackages,
    lintPackages: full.lintPackages,
    runScriptsTests: true,
  };
};

type DiffedInput = {
  root: string;
  workspaces: string[];
  fs: DiscoverFs;
  base: string;
  deps: ExecDeps;
};

const diffedResult = ({
  root,
  workspaces,
  fs,
  base,
  deps,
}: DiffedInput): AffectedResult => {
  try {
    const changedFiles = getChangedFiles(root, base, deps.execSync);
    return discoverAffectedPackages(root, workspaces, changedFiles, fs);
  } catch {
    console.warn(
      `discover-affected: could not diff against ${base}; falling back to full matrix`,
    );
    return fullMatrixResult(root, workspaces, fs);
  }
};

export const runDiscoverAffectedPackagesCli = (
  deps: ExecDeps = createDefaultExecDeps(),
): void => {
  const root = join(new URL('..', import.meta.url).pathname);
  const {workspaces = []} = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  ) as {workspaces?: string[]};
  const fs: DiscoverFs = {existsSync, readFileSync, readdirSync};
  const {base, all} = resolveBase();
  const result =
    all || !base
      ? fullMatrixResult(root, workspaces, fs)
      : diffedResult({root, workspaces, fs, base, deps});
  writeOutput(formatGithubOutput(result));
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

export const maybeRunDiscoverAffectedPackagesCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = runDiscoverAffectedPackagesCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunDiscoverAffectedPackagesCli();
