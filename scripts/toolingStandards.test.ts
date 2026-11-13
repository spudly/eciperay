import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root = new URL('..', import.meta.url).pathname;

describe('shared tooling standard wiring (#516)', () => {
  it('runs lint-staged with --relative so the actionlint stage receives repo-relative workflow paths', () => {
    const hook = readFileSync(join(root, '.husky/pre-commit'), 'utf8');
    expect(hook).toContain('npx lint-staged --relative');
    const pkg = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8'),
    ) as {'lint-staged': Record<string, string | string[]>};
    expect(pkg['lint-staged']['.github/workflows/*.{yml,yaml}']).toBe(
      'spudly-tooling actionlint --staged',
    );
  });
});
