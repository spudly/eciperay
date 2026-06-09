import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

type PackageJson = {engines?: {node?: string}};

const root = new URL('..', import.meta.url).pathname;

const extractMajor = (constraint: string) =>
  constraint.replaceAll(/[^0-9.]/g, '').split('.')[0] ?? '';

const readJson = (path: string): PackageJson =>
  JSON.parse(readFileSync(path, 'utf8')) as PackageJson;

const rootPkg = readJson(join(root, 'package.json'));
const rootEngine = extractMajor(rootPkg.engines?.node ?? '');

if (!rootEngine) {
  console.error('FAIL: root package.json has no engines.node field');
  process.exit(1);
}

let failed = false;

// Check every workspace package.json
const packageDirs = readdirSync(join(root, 'packages'), {withFileTypes: true})
  .filter(d => d.isDirectory())
  .map(d => join(root, 'packages', d.name, 'package.json'));

for (const pkgPath of packageDirs) {
  const pkg = readJson(pkgPath);
  const major = extractMajor(pkg.engines?.node ?? '');
  const rel = pkgPath.replace(root, '');
  if (major !== rootEngine) {
    console.error(
      `FAIL: ${rel} engines.node (${major}) does not match root (${rootEngine})`,
    );
    failed = true;
  }
}

// Check .nvmrc
const nvmrc = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
if (nvmrc !== rootEngine) {
  console.error(
    `FAIL: .nvmrc (${nvmrc}) does not match root engines.node (${rootEngine})`,
  );
  failed = true;
}

// Check ci.yml node-version
const ciYml = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
const ciNodeMatch = /node-version:\s*['"]?(\d+)/.exec(ciYml);
const ciNode = ciNodeMatch?.[1] ?? '';
if (ciNode !== rootEngine) {
  console.error(
    `FAIL: ci.yml node-version (${ciNode}) does not match root engines.node (${rootEngine})`,
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(
  `OK: all engines.node constraints, .nvmrc, and ci.yml agree on Node ${rootEngine}`,
);
