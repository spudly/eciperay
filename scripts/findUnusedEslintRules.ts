import {builtinRules} from 'eslint/use-at-your-own-risk';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactNativePlugin from 'eslint-plugin-react-native';
import nPlugin from 'eslint-plugin-n';
import importXPlugin from 'eslint-plugin-import-x';
import jestPlugin from 'eslint-plugin-jest';
import unicornPlugin from 'eslint-plugin-unicorn';
import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments';

type Plugin = {rules?: Record<string, unknown>};

const PLUGINS: Record<string, Plugin> = {
  '@typescript-eslint': tseslint.plugin as Plugin,
  'react': reactPlugin,
  'react-hooks': reactHooksPlugin,
  'react-native': reactNativePlugin,
  'n': nPlugin,
  'import-x': importXPlugin,
  'jest': jestPlugin,
  'unicorn': unicornPlugin,
  'eslint-comments': eslintCommentsPlugin,
};

const getConfiguredRules = async (): Promise<Set<string>> => {
  const {default: configs} = (await import('../eslint.config.ts')) as {
    default: {rules?: Record<string, unknown>}[];
  };
  const configured = new Set<string>();
  for (const config of configs) {
    for (const rule of Object.keys(config.rules ?? {})) {
      configured.add(rule);
    }
  }
  return configured;
};

const checkPluginRules = (
  configured: Set<string>,
): {plugin: string; unused: string[]}[] => {
  const results: {plugin: string; unused: string[]}[] = [];
  for (const [prefix, plugin] of Object.entries(PLUGINS)) {
    const available = Object.keys(plugin.rules ?? {}).map(
      r => `${prefix}/${r}`,
    );
    const unused = available.filter(r => !configured.has(r));
    results.push({plugin: prefix, unused});
  }
  return results;
};

const checkCoreRules = (configured: Set<string>): string[] => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- builtinRules is the only stable way to enumerate all ESLint core rules; no public replacement exists in ESLint 9
  const available = [...builtinRules.keys()];
  return available.filter(r => !configured.has(r));
};

const run = async () => {
  const configured = await getConfiguredRules();
  let totalUnused = 0;

  const coreUnused = checkCoreRules(configured);
  if (coreUnused.length > 0) {
    console.log(`\ncore ESLint: ${coreUnused.length} unconfigured rules`);
    for (const rule of coreUnused) {
      console.log(`  ${rule}`);
    }
    totalUnused += coreUnused.length;
  }

  const pluginResults = checkPluginRules(configured);
  for (const {plugin, unused} of pluginResults) {
    if (unused.length > 0) {
      console.log(`\n${plugin}: ${unused.length} unconfigured rules`);
      for (const rule of unused) {
        console.log(`  ${rule}`);
      }
      totalUnused += unused.length;
    }
  }

  if (totalUnused === 0) {
    console.log('\nAll rules (core + plugins) are explicitly configured.');
  } else {
    console.log(`\nTotal unconfigured rules: ${totalUnused}`);
    process.exitCode = 1;
  }
};

await run();
