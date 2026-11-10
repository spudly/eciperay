import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const root = join(import.meta.dirname, '..');

type PackageJson = {scripts?: Record<string, string>};

const readPackageJson = (path: string): PackageJson =>
  JSON.parse(readFileSync(path, 'utf8')) as PackageJson;

describe('workspace typecheck scripts', () => {
  const packagesDir = join(root, 'packages');
  const packageDirs = readdirSync(packagesDir, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  it('covers all six workspace packages', () => {
    expect(packageDirs).toEqual([
      'app',
      'client',
      'mcp-server',
      'server',
      'types',
      'web',
    ]);
  });

  it.each(packageDirs)(
    'packages/%s typecheck script retains --incremental',
    name => {
      const pkg = readPackageJson(join(packagesDir, name, 'package.json'));
      expect(pkg.scripts?.typecheck).toBeDefined();
      expect(pkg.scripts?.typecheck).toContain('--incremental');
    },
  );
});
