import {
  RecipeProvenanceError,
  defaultVisibilityForProvenance,
  deriveRecipeProvenance,
} from './recipeProvenance.js';

describe('deriveRecipeProvenance (#609)', () => {
  test('maps creation paths to provenance sources', () => {
    expect(deriveRecipeProvenance('manual', {sourceUrl: null})).toEqual({
      source: 'original',
      detail: null,
    });
    expect(deriveRecipeProvenance('ai', {sourceUrl: null})).toEqual({
      source: 'ai_generated',
      detail: null,
    });
    expect(deriveRecipeProvenance('import_bulk', {sourceUrl: null})).toEqual({
      source: 'import_bulk',
      detail: null,
    });
  });

  test('URL imports record the source URL as detail', () => {
    expect(
      deriveRecipeProvenance('import_url', {
        sourceUrl: 'https://example.com/recipe',
      }),
    ).toEqual({source: 'import_url', detail: 'https://example.com/recipe'});
  });

  test('URL imports without a source URL are rejected', () => {
    expect(() =>
      deriveRecipeProvenance('import_url', {sourceUrl: null}),
    ).toThrow(RecipeProvenanceError);
  });

  test('website provenance detail must be a valid http(s) URL', () => {
    expect(() =>
      deriveRecipeProvenance('import_url', {sourceUrl: 'not a url'}),
    ).toThrow(RecipeProvenanceError);
    expect(() =>
      deriveRecipeProvenance('import_url', {sourceUrl: 'ftp://example.com/x'}),
    ).toThrow(RecipeProvenanceError);
  });

  test('cookbook photo imports carry the cookbook identification', () => {
    expect(
      deriveRecipeProvenance('import_image', {sourceUrl: null}, 'Joy of Cooking'),
    ).toEqual({source: 'import_cookbook_photo', detail: 'Joy of Cooking'});
  });
});

describe('defaultVisibilityForProvenance (#609)', () => {
  test('new recipes are public by default for every creation source', () => {
    for (const source of [
      'original',
      'ai_generated',
      'import_url',
      'import_cookbook_photo',
      'import_text',
      'import_bulk',
    ] as const) {
      expect(defaultVisibilityForProvenance({source, detail: null})).toBe(
        'public',
      );
    }
  });

  test('clones and unattributed other stay private', () => {
    expect(
      defaultVisibilityForProvenance({source: 'shared_clone', detail: null}),
    ).toBe('private');
    expect(
      defaultVisibilityForProvenance({source: 'other', detail: null}),
    ).toBe('private');
    expect(
      defaultVisibilityForProvenance({source: 'other', detail: 'Family card'}),
    ).toBe('public');
  });
});
