import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  checkMirrorPairs,
  formatMirrorPairErrors,
  validateAllComponentsRegistered,
  validateChangedComponentsRegistered,
  validateChangedMirrorPairs,
  validateMirrorPairFilesExist,
  validatePlatformOnlyEntries,
  validatePlatformOnlyFilesExist,
} from './checkMirrorPairs.ts';

describe('validatePlatformOnlyEntries', () => {
  test('flags entries without a reason', () => {
    const errors = validatePlatformOnlyEntries([
      {path: 'AppShell.tsx', platform: 'web', reason: '   '},
    ]);

    expect(errors).toEqual([
      'PLATFORM_ONLY entry missing reason: AppShell.tsx',
    ]);
  });
});

describe('validateMirrorPairFilesExist', () => {
  test('flags missing mirror files', () => {
    const errors = validateMirrorPairFilesExist('/missing-root');

    expect(
      errors.some(error => error.includes('Missing app mirror file')),
    ).toBe(true);
    expect(
      errors.some(error => error.includes('Missing web mirror file')),
    ).toBe(true);
  });
});

describe('validatePlatformOnlyFilesExist', () => {
  test('flags missing platform-only files', () => {
    const errors = validatePlatformOnlyFilesExist('/missing-root');

    expect(
      errors.some(error => error.includes('PLATFORM_ONLY file missing')),
    ).toBe(true);
  });
});

describe('validateAllComponentsRegistered', () => {
  test('flags unregistered web components', () => {
    const root = mkdtempSync(join(tmpdir(), 'eciperay-ui-parity-'));
    mkdirSync(join(root, 'packages/app/src/components'), {recursive: true});
    mkdirSync(join(root, 'packages/web/src/components'), {recursive: true});
    writeFileSync(
      join(root, 'packages/web/src/components/Unregistered.tsx'),
      '',
    );

    const errors = validateAllComponentsRegistered(root);

    expect(errors).toEqual(['Unregistered web component: Unregistered.tsx']);
  });

  test('flags unregistered app components', () => {
    const root = mkdtempSync(join(tmpdir(), 'eciperay-ui-parity-'));
    mkdirSync(join(root, 'packages/app/src/components'), {recursive: true});
    mkdirSync(join(root, 'packages/web/src/components'), {recursive: true});
    writeFileSync(
      join(root, 'packages/app/src/components/Unregistered.tsx'),
      '',
    );

    const errors = validateAllComponentsRegistered(root);

    expect(errors).toEqual(['Unregistered app component: Unregistered.tsx']);
  });

  test('returns no errors when component roots are missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'eciperay-ui-parity-'));

    expect(validateAllComponentsRegistered(root)).toEqual([]);
  });
});

describe('validateChangedMirrorPairs', () => {
  test('flags mirror updates that touch only one platform', () => {
    const errors = validateChangedMirrorPairs([
      'packages/app/src/components/LegalLinks.tsx',
    ]);

    expect(errors).toEqual([
      'Mirror pair changed on one platform only: LegalLinks.tsx (update both app and web)',
    ]);
  });

  test('passes when both platforms change together', () => {
    const errors = validateChangedMirrorPairs([
      'packages/app/src/components/LegalLinks.tsx',
      'packages/web/src/components/LegalLinks.tsx',
    ]);

    expect(errors).toEqual([]);
  });
});

describe('validateChangedComponentsRegistered', () => {
  test('flags unregistered changed components', () => {
    const errors = validateChangedComponentsRegistered([
      'packages/app/src/components/NewWidget.tsx',
    ]);

    expect(errors).toEqual([
      'Changed component is not registered in uiParityRegistry: app:NewWidget.tsx',
    ]);
  });

  test('flags unregistered web components', () => {
    const errors = validateChangedComponentsRegistered([
      'packages/web/src/components/NewWidget.tsx',
    ]);

    expect(errors).toEqual([
      'Changed component is not registered in uiParityRegistry: web:NewWidget.tsx',
    ]);
  });

  test('ignores test files and non-component paths', () => {
    const errors = validateChangedComponentsRegistered([
      'packages/app/src/components/LegalLinks.test.tsx',
      'packages/app/src/screens/HomeScreen.tsx',
    ]);

    expect(errors).toEqual([]);
  });

  test('allows registered mirror and platform-only paths', () => {
    const errors = validateChangedComponentsRegistered([
      'packages/app/src/components/LegalLinks.tsx',
      'packages/web/src/components/LegalLinks.tsx',
      'packages/app/src/components/auth/AuthTextField.tsx',
    ]);

    expect(errors).toEqual([]);
  });
});

describe('formatMirrorPairErrors', () => {
  test('formats errors as a bullet list', () => {
    expect(formatMirrorPairErrors(['one', 'two'])).toBe('  - one\n  - two');
  });
});

describe('checkMirrorPairs', () => {
  test('validates the real workspace registry and files', () => {
    const root = join(import.meta.dirname, '..');
    const errors = checkMirrorPairs({root});

    expect(errors).toEqual([]);
  });
});
