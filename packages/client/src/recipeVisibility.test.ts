import {
  buildRecipePermalink,
  isPublishedVisibility,
  recipeVisibilityDescriptions,
  recipeVisibilityLabels,
  requiresPublishingConsent,
} from './recipeVisibility.js';

describe('recipeVisibility', () => {
  test('identifies published visibility levels', () => {
    expect(isPublishedVisibility('private')).toBe(false);
    expect(isPublishedVisibility('unlisted')).toBe(true);
    expect(isPublishedVisibility('public')).toBe(true);
  });

  test('requires consent when leaving private', () => {
    expect(requiresPublishingConsent('private', 'unlisted')).toBe(true);
    expect(requiresPublishingConsent('private', 'public')).toBe(true);
    expect(requiresPublishingConsent('unlisted', 'public')).toBe(false);
  });

  test('builds permalink URLs', () => {
    expect(
      buildRecipePermalink('https://www.eciperay.com', {
        id: 'recipe-1',
        slug: 'pasta',
      }),
    ).toBe('https://www.eciperay.com/recipe/recipe-1/pasta');
    expect(
      buildRecipePermalink(
        'https://www.eciperay.com',
        {id: 'recipe-1', slug: 'pasta'},
        'token-123',
      ),
    ).toBe('https://www.eciperay.com/recipe/recipe-1/pasta?t=token-123');
  });

  test('exposes labels and descriptions for each visibility level', () => {
    expect(recipeVisibilityLabels.public).toBe('Public');
    expect(recipeVisibilityDescriptions.unlisted).toMatch(/link/i);
  });
});
