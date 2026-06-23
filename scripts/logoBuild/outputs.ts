import {dirname, join} from 'node:path';
import type {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  darkOutputPath,
  mergeTheme,
  type ThemesConfig,
  type ThemeColors,
  type VariantsConfig,
} from './config.ts';
import {buildVariantSvg} from './svg.ts';

export type BuildLogosFs = {
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
  mkdirSync: typeof mkdirSync;
  copyFileSync: typeof copyFileSync;
};

export type RasterSources = {defaultLogoSvg: string; minimalLogoSvg: string};

type VariantOutputContext = {
  fs: BuildLogosFs;
  generatedDir: string;
  variantsConfig: VariantsConfig;
  themes: ThemesConfig;
  masters: {mark: string; wordmark: string};
  optimizeSvgFn: (input: string) => string;
};

const ensureDir = (fs: BuildLogosFs, dir: string): void => {
  fs.mkdirSync(dir, {recursive: true});
};

const writeOptimizedSvg = (
  fs: BuildLogosFs,
  path: string,
  svg: string,
  optimizeSvgFn: (input: string) => string,
): void => {
  ensureDir(fs, dirname(path));
  fs.writeFileSync(path, optimizeSvgFn(svg), 'utf8');
};

const rememberRasterSource = (
  sources: RasterSources,
  variantOutput: string,
  optimizedSvg: string,
): RasterSources => {
  if (variantOutput === 'logo.svg') {
    return {...sources, defaultLogoSvg: optimizedSvg};
  }
  if (variantOutput === 'logo-minimal.svg') {
    return {...sources, minimalLogoSvg: optimizedSvg};
  }
  return sources;
};

const writeSingleVariant = (input: {
  context: VariantOutputContext;
  variant: VariantsConfig['variants'][number];
  themeName: keyof ThemesConfig;
  theme: ThemeColors;
  sources: RasterSources;
}): RasterSources => {
  const {context, variant, themeName, theme, sources} = input;
  const output =
    themeName === 'default' ? variant.output : darkOutputPath(variant.output);
  const resolvedTheme = mergeTheme(
    theme,
    variant.type === 'mark' ? variant.theme : undefined,
  );
  const svg = buildVariantSvg(variant, resolvedTheme, context.masters);
  writeOptimizedSvg(
    context.fs,
    join(context.generatedDir, output),
    svg,
    context.optimizeSvgFn,
  );

  if (themeName !== 'default') {
    return sources;
  }

  return rememberRasterSource(
    sources,
    variant.output,
    context.optimizeSvgFn(svg),
  );
};

export const writeVariantOutputs = (
  context: VariantOutputContext,
): RasterSources => {
  let sources: RasterSources = {defaultLogoSvg: '', minimalLogoSvg: ''};

  for (const variant of context.variantsConfig.variants) {
    for (const [themeName, theme] of Object.entries(context.themes) as [
      keyof ThemesConfig,
      ThemeColors,
    ][]) {
      sources = writeSingleVariant({
        context,
        variant,
        themeName,
        theme,
        sources,
      });
    }
  }

  if (!sources.defaultLogoSvg) {
    throw new Error('Default logo.svg was not generated');
  }

  if (!sources.minimalLogoSvg) {
    throw new Error('Default logo-minimal.svg was not generated');
  }

  return sources;
};

export const copyWebAssets = (
  root: string,
  fs: BuildLogosFs,
  generatedDir: string,
  pngDir: string,
): void => {
  const webPublic = join(root, 'packages/web/public');
  ensureDir(fs, webPublic);
  fs.copyFileSync(join(pngDir, 'logo-32.png'), join(webPublic, 'favicon.png'));
  fs.copyFileSync(
    join(pngDir, 'logo-180.png'),
    join(webPublic, 'apple-touch-icon.png'),
  );
  fs.copyFileSync(join(generatedDir, 'logo.svg'), join(webPublic, 'logo.svg'));
  fs.copyFileSync(
    join(generatedDir, 'logo-horizontal.svg'),
    join(webPublic, 'logo-horizontal.svg'),
  );
};
