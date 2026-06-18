const PACKAGE_SOURCE_EXCLUSIONS = {
  app: [
    /^src\/navigation\/types\.ts$/,
    /^src\/lib\/env\.ts$/,
    /^src\/lib\/supabase\.ts$/,
    /^src\/navigation\/.+\.tsx$/,
    /^src\/__tests__\/testUtils\.tsx$/,
  ],
  client: [/^src\/index\.ts$/, /^src\/test\//],
  server: [
    /^src\/loadEnv\.ts$/,
    /^src\/db\/migrate\.ts$/,
    /^src\/db\/pool\.ts$/,
    /^src\/db\/query\.ts$/,
    /^src\/test\//,
  ],
  web: [
    /^src\/main\.tsx$/,
    /^src\/lib\/env\.ts$/,
    /^src\/vite-env\.d\.ts$/,
    /^src\/test\/testUtils\.tsx$/,
  ],
} satisfies Record<string, RegExp[]>;

const isKnownPackage = (
  pkg: string,
): pkg is keyof typeof PACKAGE_SOURCE_EXCLUSIONS =>
  pkg in PACKAGE_SOURCE_EXCLUSIONS;

export const isCoverageExcluded = (
  relPath: string,
  isTestFile: (path: string) => boolean,
): boolean => {
  const match = /^packages\/([^/]+)\/(.+)$/.exec(relPath);
  if (!match) {
    return true;
  }
  const [, pkg, subPath] = match;
  if (!pkg || !subPath) {
    return true;
  }

  if (subPath.endsWith('.d.ts') || isTestFile(subPath)) {
    return true;
  }

  if (!isKnownPackage(pkg)) {
    return true;
  }

  const patterns = PACKAGE_SOURCE_EXCLUSIONS[pkg];
  return patterns.some(pattern => pattern.test(subPath));
};
