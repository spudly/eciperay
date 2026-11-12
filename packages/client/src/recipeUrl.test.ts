import {
  buildRecipeCanonicalUrl,
  buildRecipePath,
  recipeSlugFor,
  slugifyRecipeTitle,
} from './recipeUrl.js';

describe('slugifyRecipeTitle', () => {
  test('lowercases and hyphenates words', () => {
    expect(slugifyRecipeTitle('Chicken Tikka Masala')).toBe(
      'chicken-tikka-masala',
    );
    expect(slugifyRecipeTitle('Fiesta Lime Chicken Tacos')).toBe(
      'fiesta-lime-chicken-tacos',
    );
  });

  test('strips punctuation and apostrophes', () => {
    expect(slugifyRecipeTitle('Mom\'s "Best" Pie!')).toBe('moms-best-pie');
    expect(slugifyRecipeTitle('Salt & Pepper Squid')).toBe('salt-pepper-squid');
  });

  test('normalizes accented characters', () => {
    expect(slugifyRecipeTitle('Crème Brûlée')).toBe('creme-brulee');
  });

  test('collapses repeated whitespace and hyphens, trims edge hyphens', () => {
    expect(slugifyRecipeTitle('a   b---c')).toBe('a-b-c');
    expect(slugifyRecipeTitle('  --Pasta--  ')).toBe('pasta');
  });

  test('keeps digits', () => {
    expect(slugifyRecipeTitle('Top 10 Soups 2026')).toBe('top-10-soups-2026');
  });

  test('falls back to recipe for empty or punctuation-only titles', () => {
    expect(slugifyRecipeTitle('')).toBe('recipe');
    expect(slugifyRecipeTitle('   ')).toBe('recipe');
    expect(slugifyRecipeTitle('!!!')).toBe('recipe');
  });

  test('a renamed title slugifies to the new canonical slug', () => {
    expect(slugifyRecipeTitle('Fiesta Lime Chicken Tacos')).toBe(
      'fiesta-lime-chicken-tacos',
    );
    expect(slugifyRecipeTitle('Fiesta Lime Chicken Burritos')).toBe(
      'fiesta-lime-chicken-burritos',
    );
  });
});

describe('recipeSlugFor', () => {
  test('uses the stored slug verbatim, including a de-duplicated suffix', () => {
    expect(
      recipeSlugFor({
        id: 'recipe-1',
        slug: 'qa-finalization-public-pie-3',
        title: 'Qa Finalization Public Pie',
      }),
    ).toBe('qa-finalization-public-pie-3');
  });

  test('derives the slug from the title when no stored slug is known', () => {
    expect(recipeSlugFor({id: 'recipe-1', title: 'Test Recipe'})).toBe(
      'test-recipe',
    );
    expect(
      recipeSlugFor({id: 'recipe-1', slug: '', title: 'Test Recipe'}),
    ).toBe('test-recipe');
    expect(
      recipeSlugFor({id: 'recipe-1', slug: null, title: 'Test Recipe'}),
    ).toBe('test-recipe');
  });

  test('returns null when neither slug nor title is known', () => {
    expect(recipeSlugFor({id: 'recipe-1'})).toBeNull();
  });
});

describe('buildRecipePath', () => {
  test('builds the canonical slugged path from the stored slug', () => {
    expect(buildRecipePath({id: 'recipe-1', slug: 'pasta'})).toBe(
      '/recipes/recipe-1/pasta',
    );
  });

  test('builds the canonical slugged path from the title', () => {
    expect(buildRecipePath({id: 'recipe-1', title: 'Fiesta Lime Tacos'})).toBe(
      '/recipes/recipe-1/fiesta-lime-tacos',
    );
  });

  test('falls back to the bare-ID path when no slug can be derived', () => {
    expect(buildRecipePath({id: 'recipe-1'})).toBe('/recipes/recipe-1');
  });
});

describe('buildRecipeCanonicalUrl', () => {
  test('builds the absolute canonical URL from a base URL', () => {
    expect(
      buildRecipeCanonicalUrl('https://www.eciperay.com', {
        id: '520643af-3176-4a36-a6ca-282f33b55beb',
        slug: 'fiesta-lime-chicken-tacos',
      }),
    ).toBe(
      'https://www.eciperay.com/recipes/520643af-3176-4a36-a6ca-282f33b55beb/fiesta-lime-chicken-tacos',
    );
  });
});
