import {readFileSync} from 'node:fs';
import {join} from 'node:path';

export type PackageJsonDeps = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  name?: string;
};

export const readPackageJson = (
  root: string,
  workspace: string,
  readFile: typeof readFileSync,
): PackageJsonDeps | undefined => {
  try {
    return JSON.parse(
      readFile(join(root, workspace, 'package.json'), 'utf8'),
    ) as PackageJsonDeps;
  } catch {
    // Unreadable package.json: the workspace just won't participate in
    // dependent expansion.
    return undefined;
  }
};

export const readWorkspaceNameMap = (
  root: string,
  workspaces: string[],
  readFile: typeof readFileSync,
): Map<string, string> => {
  const nameToDir = new Map<string, string>();
  for (const ws of workspaces) {
    const pkg = readPackageJson(root, ws, readFile);
    if (pkg?.name) {
      nameToDir.set(pkg.name, ws);
    }
  }
  return nameToDir;
};

export const internalDepDirs = (
  pkg: PackageJsonDeps | undefined,
  workspace: string,
  nameToDir: Map<string, string>,
): string[] => {
  if (!pkg) {
    return [];
  }
  const depNames = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);
  const dirs: string[] = [];
  for (const depName of depNames) {
    const depDir = nameToDir.get(depName);
    if (depDir && depDir !== workspace) {
      dirs.push(depDir);
    }
  }
  return dirs;
};

/**
 * Reverse dependency graph: workspace dir -> set of workspace dirs that
 * directly depend on it.
 */
export const buildDependentsGraph = (
  root: string,
  workspaces: string[],
  nameToDir: Map<string, string>,
  readFile: typeof readFileSync,
): Map<string, Set<string>> => {
  const dependents = new Map<string, Set<string>>();
  for (const ws of workspaces) {
    dependents.set(ws, new Set());
  }
  for (const ws of workspaces) {
    const pkg = readPackageJson(root, ws, readFile);
    for (const depDir of internalDepDirs(pkg, ws, nameToDir)) {
      dependents.get(depDir)?.add(ws);
    }
  }
  return dependents;
};

export const expandDependents = (
  direct: Set<string>,
  dependents: Map<string, Set<string>>,
): Set<string> => {
  const expanded = new Set(direct);
  const queue = [...direct];
  let current = queue.pop();
  while (current !== undefined) {
    for (const dependent of dependents.get(current) ?? []) {
      if (!expanded.has(dependent)) {
        expanded.add(dependent);
        queue.push(dependent);
      }
    }
    current = queue.pop();
  }
  return expanded;
};
