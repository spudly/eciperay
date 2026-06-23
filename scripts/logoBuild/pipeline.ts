import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

import yaml from 'js-yaml';
import sharp from 'sharp';
import {optimize} from 'svgo';

import {
  MINIMAL_RASTER_SIZE_THRESHOLD,
  PNG_SIZES,
  type ThemesConfig,
  validateThemeColors,
  type VariantsConfig,
} from './config.ts';
import {
  copyWebAssets,
  writeVariantOutputs,
  type BuildLogosFs,
} from './outputs.ts';

export type {BuildLogosFs} from './outputs.ts';

export type BuildLogosDeps = {
  optimizeSvg: (svg: string) => string;
  rasterizePng: (svg: string, size: number) => Promise<Buffer>;
};

export const defaultBuildLogosFs: BuildLogosFs = {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
};

export const assertOptimizedSvg = (data: string | undefined): string => {
  if (!data) {
    throw new Error('SVGO optimization failed');
  }
  return data;
};

export const optimizeSvg = (svg: string): string => {
  const result = optimize(svg, {multipass: true, plugins: ['preset-default']});
  return assertOptimizedSvg(result.data);
};

export const defaultBuildLogosDeps: BuildLogosDeps = {
  optimizeSvg,
  rasterizePng: async (svg: string, size: number) =>
    sharp(Buffer.from(svg)).resize(size, size).png().toBuffer(),
};

export const rasterizePng = defaultBuildLogosDeps.rasterizePng;

export const selectRasterSvg = (
  size: number,
  defaultSvg: string,
  minimalSvg: string,
): string => (size < MINIMAL_RASTER_SIZE_THRESHOLD ? minimalSvg : defaultSvg);

const loadLogoConfig = (
  fs: BuildLogosFs,
  logosDir: string,
): {
  themes: ThemesConfig;
  variantsConfig: VariantsConfig;
  masters: {mark: string; wordmark: string};
} => {
  const themes = yaml.load(
    fs.readFileSync(join(logosDir, 'themes.yaml'), 'utf8'),
  ) as ThemesConfig;
  const variantsConfig = yaml.load(
    fs.readFileSync(join(logosDir, 'variants.yaml'), 'utf8'),
  ) as VariantsConfig;

  validateThemeColors(themes.default, 'default');
  validateThemeColors(themes.dark, 'dark');

  return {
    themes,
    variantsConfig,
    masters: {
      mark: fs.readFileSync(join(logosDir, 'master/mark.svg'), 'utf8'),
      wordmark: fs.readFileSync(join(logosDir, 'master/wordmark.svg'), 'utf8'),
    },
  };
};

const writeRasterPngs = async (
  fs: BuildLogosFs,
  pngDir: string,
  sources: {defaultLogoSvg: string; minimalLogoSvg: string},
  rasterizePngFn: BuildLogosDeps['rasterizePng'],
): Promise<void> => {
  fs.mkdirSync(pngDir, {recursive: true});
  for (const size of PNG_SIZES) {
    const svg = selectRasterSvg(
      size,
      sources.defaultLogoSvg,
      sources.minimalLogoSvg,
    );
    const png = await rasterizePngFn(svg, size);
    fs.writeFileSync(join(pngDir, `logo-${size}.png`), png);
  }
};

export const buildLogos = async (
  root: string,
  fs: BuildLogosFs = defaultBuildLogosFs,
  deps: BuildLogosDeps = defaultBuildLogosDeps,
): Promise<void> => {
  const logosDir = join(root, 'packages/theme/logos');
  const generatedDir = join(logosDir, 'generated');
  const pngDir = join(generatedDir, 'png');
  const {themes, variantsConfig, masters} = loadLogoConfig(fs, logosDir);
  const sources = writeVariantOutputs({
    fs,
    generatedDir,
    variantsConfig,
    themes,
    masters,
    optimizeSvgFn: deps.optimizeSvg,
  });

  await writeRasterPngs(fs, pngDir, sources, deps.rasterizePng);
  copyWebAssets(root, fs, generatedDir, pngDir);
};
