import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {buildLogos} from './logoBuild/pipeline.ts';

export * from './logoBuild/config.ts';
export * from './logoBuild/svg.ts';
export {
  assertOptimizedSvg,
  buildLogos,
  defaultBuildLogosDeps,
  defaultBuildLogosFs,
  optimizeSvg,
  rasterizePng,
  selectRasterSvg,
  type BuildLogosDeps,
  type BuildLogosFs,
} from './logoBuild/pipeline.ts';

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

export const runBuildLogosCli = async (): Promise<void> => {
  const root = join(new URL('..', import.meta.url).pathname);
  await buildLogos(root);
  console.log('OK: logo assets built');
};

export const maybeRunBuildLogosCli = (
  directRun: boolean = isDirectRun(),
  run: () => Promise<void> = runBuildLogosCli,
): void => {
  if (directRun) {
    void run().catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
  }
};

maybeRunBuildLogosCli();
