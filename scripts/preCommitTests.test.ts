import assert from 'node:assert/strict';
import {describe, test} from 'node:test';

import {
  affectedCoveragePackages,
  findMissingColocatedTests,
} from './preCommitTestRules.ts';

const root = new URL('..', import.meta.url).pathname;

describe('findMissingColocatedTests', () => {
  test('requires a colocated test for new app components', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/app/src/components/NewExample.tsx'],
      ['packages/app/src/components/NewExample.tsx'],
    );
    assert.deepEqual(failures, [
      'packages/app/src/components/NewExample.tsx (expected packages/app/src/components/NewExample.test.ts or packages/app/src/components/NewExample.test.tsx)',
    ]);
  });

  test('passes when the colocated test is staged', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/app/src/components/NewExample.tsx'],
      [
        'packages/app/src/components/NewExample.tsx',
        'packages/app/src/components/NewExample.test.tsx',
      ],
    );
    assert.deepEqual(failures, []);
  });

  test('does not require colocated tests for new web pages', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/web/src/pages/PrivacyPolicyPage.tsx'],
      ['packages/web/src/pages/PrivacyPolicyPage.tsx'],
    );
    assert.deepEqual(failures, []);
  });

  test('requires colocated tests for new web lib modules', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/web/src/lib/newExportHelper.ts'],
      ['packages/web/src/lib/newExportHelper.ts'],
    );
    assert.deepEqual(failures, [
      'packages/web/src/lib/newExportHelper.ts (expected packages/web/src/lib/newExportHelper.test.ts or packages/web/src/lib/newExportHelper.test.tsx)',
    ]);
  });

  test('skips coverage-excluded files', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/client/src/index.ts'],
      ['packages/client/src/index.ts'],
    );
    assert.deepEqual(failures, []);
  });
});

describe('affectedCoveragePackages', () => {
  test('returns packages with staged src changes only', () => {
    assert.deepEqual(
      affectedCoveragePackages([
        'packages/app/src/screens/ProfileScreen.tsx',
        'README.md',
        'packages/web/src/pages/auth/LoginPage.test.tsx',
      ]),
      ['app'],
    );
  });

  test('returns multiple packages when needed', () => {
    assert.deepEqual(
      affectedCoveragePackages([
        'packages/app/src/screens/ProfileScreen.tsx',
        'packages/client/src/legalUrls.ts',
      ]),
      ['app', 'client'],
    );
  });
});
