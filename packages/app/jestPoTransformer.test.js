import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {poCacheKey} from './jestPoCacheKey.cjs';
import {messages as enXAMessages} from './jestPoFixtures/locales/en-XA/messages.po';

// Regression test for jestPoTransformer.cjs (#588): importing the fixture
// catalog runs it through the transformer exactly as production imports
// are transformed. The en-XA fixture deliberately omits test.onlySource,
// which exists only in the en-US fixture: production compiles source-only
// keys into every locale (resolved through the fallback chain), so the
// Jest-compiled catalog must contain it too — an empty en-XA translation
// would not exercise this path, because that key would still be built
// from the target catalog's own key set.
describe('jestPoTransformer', () => {
  it('includes source-locale keys absent from the target catalog, resolved through the fallback chain', () => {
    expect(enXAMessages['test.onlySource']).toEqual(['Source only string']);
  });

  it('keeps the target translation when one is present', () => {
    expect(enXAMessages['test.shared']).toEqual(['Shared source string~']);
  });

  it('changes the cache key when a sibling catalog changes but the target catalog does not', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'po-cache-key-'));
    const sourcePath = path.join(
      rootDir,
      'locales/en-XA',
      'messages.po',
    );
    const siblingPath = path.join(
      rootDir,
      'locales/en-US',
      'messages.po',
    );
    fs.mkdirSync(path.dirname(sourcePath), {recursive: true});
    fs.mkdirSync(path.dirname(siblingPath), {recursive: true});
    fs.writeFileSync(sourcePath, 'target catalog v1');
    fs.writeFileSync(siblingPath, 'source catalog v1');

    const before = poCacheKey('target catalog v1', sourcePath, 'transformer');
    // Same target content, same path, same transformer: stable key.
    expect(poCacheKey('target catalog v1', sourcePath, 'transformer')).toBe(
      before,
    );

    fs.writeFileSync(siblingPath, 'source catalog v2');
    expect(poCacheKey('target catalog v1', sourcePath, 'transformer')).not.toBe(
      before,
    );
    // A transformer change also invalidates.
    expect(poCacheKey('target catalog v1', sourcePath, 'transformer v2')).not.toBe(
      before,
    );
  });
});
