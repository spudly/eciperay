/* eslint-disable max-lines -- UI parity validation across app/web mirrors */
import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

import {
  MIRROR_PAIRS,
  PLATFORM_ONLY,
  mirrorPairSet,
  platformOnlyByPath,
  type PlatformOnlyEntry,
} from './uiParityRegistry.ts';

const isComponentSource = (relativePath: string): boolean =>
  relativePath.endsWith('.tsx') && !relativePath.endsWith('.test.tsx');

const listComponentFiles = (
  root: string,
  platform: 'app' | 'web',
): string[] => {
  const componentsRoot = join(root, 'packages', platform, 'src', 'components');
  if (!existsSync(componentsRoot)) {
    return [];
  }
  const results: string[] = [];

  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), rel);
        continue;
      }
      if (isComponentSource(rel)) {
        results.push(rel);
      }
    }
  };

  walk(componentsRoot, '');
  return results.sort();
};

export const validatePlatformOnlyEntries = (
  entries: PlatformOnlyEntry[],
): string[] => {
  const errors: string[] = [];
  for (const entry of entries) {
    if (!entry.reason.trim()) {
      errors.push(`PLATFORM_ONLY entry missing reason: ${entry.path}`);
    }
  }
  return errors;
};

export const validateMirrorPairFilesExist = (root: string): string[] => {
  const errors: string[] = [];
  for (const relPath of MIRROR_PAIRS) {
    const appPath = join(root, 'packages/app/src/components', relPath);
    const webPath = join(root, 'packages/web/src/components', relPath);
    if (!existsSync(appPath)) {
      errors.push(`Missing app mirror file: ${relPath}`);
    }
    if (!existsSync(webPath)) {
      errors.push(`Missing web mirror file: ${relPath}`);
    }
  }
  return errors;
};

export const validatePlatformOnlyFilesExist = (root: string): string[] => {
  const errors: string[] = [];
  for (const entry of PLATFORM_ONLY) {
    const fullPath = join(
      root,
      'packages',
      entry.platform,
      'src/components',
      entry.path,
    );
    if (!existsSync(fullPath)) {
      errors.push(
        `PLATFORM_ONLY file missing (${entry.platform}): ${entry.path}`,
      );
    }
  }
  return errors;
};

export const validateAllComponentsRegistered = (root: string): string[] => {
  const errors: string[] = [];

  for (const relPath of listComponentFiles(root, 'app')) {
    if (mirrorPairSet.has(relPath)) {
      continue;
    }
    if (platformOnlyByPath.has(`app:${relPath}`)) {
      continue;
    }
    errors.push(`Unregistered app component: ${relPath}`);
  }

  for (const relPath of listComponentFiles(root, 'web')) {
    if (mirrorPairSet.has(relPath)) {
      continue;
    }
    if (platformOnlyByPath.has(`web:${relPath}`)) {
      continue;
    }
    errors.push(`Unregistered web component: ${relPath}`);
  }

  return errors;
};

const toComponentRelPath = (changedFile: string): string | null => {
  const match = /^packages\/(app|web)\/src\/components\/(.+\.tsx)$/.exec(
    changedFile,
  );
  const relPath = match?.[2];
  if (!relPath || relPath.endsWith('.test.tsx')) {
    return null;
  }
  return relPath;
};

export const validateChangedMirrorPairs = (
  changedFiles: string[],
): string[] => {
  const errors: string[] = [];

  for (const relPath of MIRROR_PAIRS) {
    const appFile = `packages/app/src/components/${relPath}`;
    const webFile = `packages/web/src/components/${relPath}`;
    const appChanged = changedFiles.includes(appFile);
    const webChanged = changedFiles.includes(webFile);
    if (appChanged !== webChanged) {
      errors.push(
        `Mirror pair changed on one platform only: ${relPath} (update both app and web)`,
      );
    }
  }

  return errors;
};

export const validateChangedComponentsRegistered = (
  root: string,
  changedFiles: string[],
): string[] => {
  const errors: string[] = [];

  for (const file of changedFiles) {
    const relPath = toComponentRelPath(file);
    if (!relPath) {
      continue;
    }
    if (!existsSync(join(root, file))) {
      continue;
    }
    const platform = file.startsWith('packages/app/') ? 'app' : 'web';
    if (mirrorPairSet.has(relPath)) {
      continue;
    }
    if (platformOnlyByPath.has(`${platform}:${relPath}`)) {
      continue;
    }
    errors.push(
      `Changed component is not registered in uiParityRegistry: ${platform}:${relPath}`,
    );
  }

  return errors;
};

export type CheckMirrorPairsOptions = {root: string; changedFiles?: string[]};

export const checkMirrorPairs = ({
  root,
  changedFiles = [],
}: CheckMirrorPairsOptions): string[] => [
  ...validatePlatformOnlyEntries(PLATFORM_ONLY),
  ...validateMirrorPairFilesExist(root),
  ...validatePlatformOnlyFilesExist(root),
  ...validateAllComponentsRegistered(root),
  ...validateChangedMirrorPairs(changedFiles),
  ...validateChangedComponentsRegistered(root, changedFiles),
];

export const formatMirrorPairErrors = (errors: string[]): string =>
  errors.map(error => `  - ${error}`).join('\n');
