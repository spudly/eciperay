import {
  buildRecipePermalink,
  buildRecipeShareUrl,
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

  test('renders the stored slug verbatim, including a de-duplicated suffix (#498)', () => {
    // The server owns the canonical slug: when the stored slug carries
    // a numeric suffix, the permalink must display it exactly — the
    // client never re-derives or strips it.
    expect(
      buildRecipePermalink('https://www.eciperay.com', {
        id: 'recipe-1',
        slug: 'qa-finalization-public-pie-3',
      }),
    ).toBe(
      'https://www.eciperay.com/recipe/recipe-1/qa-finalization-public-pie-3',
    );
    expect(
      buildRecipeShareUrl('https://www.eciperay.com', {
        id: 'recipe-1',
        slug: 'qa-finalization-public-pie-3',
        visibility: 'public',
        sourceUrl: null,
      }),
    ).toBe(
      'https://www.eciperay.com/recipe/recipe-1/qa-finalization-public-pie-3',
    );
  });

  test('builds share URLs that always point at Eciperay (#534)', () => {
    const recipe = {
      id: 'recipe-1',
      slug: 'pasta',
      visibility: 'private' as const,
      sourceUrl: null,
    };
    // Private recipes share the canonical permalink too — with a token
    // it opens through the public route; the old app-route form is gone.
    expect(buildRecipeShareUrl('https://www.eciperay.com', recipe)).toBe(
      'https://www.eciperay.com/recipe/recipe-1/pasta',
    );
    expect(
      buildRecipeShareUrl('https://www.eciperay.com', recipe, 'token-123'),
    ).toBe('https://www.eciperay.com/recipe/recipe-1/pasta?t=token-123');
    expect(
      buildRecipeShareUrl('https://www.eciperay.com', {
        ...recipe,
        visibility: 'public',
      }),
    ).toBe('https://www.eciperay.com/recipe/recipe-1/pasta');
    expect(
      buildRecipeShareUrl(
        'https://www.eciperay.com',
        {...recipe, visibility: 'unlisted'},
        'token-123',
      ),
    ).toBe('https://www.eciperay.com/recipe/recipe-1/pasta?t=token-123');
    // A token supplied for a public recipe rides along too.
    expect(
      buildRecipeShareUrl(
        'https://www.eciperay.com',
        {...recipe, visibility: 'public'},
        'token-123',
      ),
    ).toBe('https://www.eciperay.com/recipe/recipe-1/pasta?t=token-123');
    // Never the source URL, whatever the visibility.
    expect(
      buildRecipeShareUrl('https://www.eciperay.com', {
        ...recipe,
        sourceUrl: 'https://example.com/original',
      }),
    ).toBe('https://www.eciperay.com/recipe/recipe-1/pasta');
  });

  test('exposes labels and descriptions for each visibility level', () => {
    expect(recipeVisibilityLabels.public).toBe('Public');
    expect(recipeVisibilityDescriptions.unlisted).toMatch(/link/i);
  });
});
