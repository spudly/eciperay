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
});
