import {makeRecipeDetail, VERSION_ID} from './test/fixtures/recipe.js';
import {buildShareText} from './buildShareText.js';

describe('buildShareText', () => {
  test('includes title and servings', () => {
    const text = buildShareText(makeRecipeDetail({title: 'Pasta'}));
    expect(text).toContain('Pasta');
    expect(text).toContain('4 servings');
  });

  test('includes ingredients and instructions', () => {
    const text = buildShareText(makeRecipeDetail());
    expect(text).toContain('Flour');
    expect(text).toContain('Mix dry ingredients');
  });

  test('handles null quantity ingredients', () => {
    const text = buildShareText(
      makeRecipeDetail({
        ingredients: [
          {
            id: 'i-2',
            recipeVersionId: VERSION_ID,
            sortOrder: 0,
            name: 'Salt',
            quantity: null,
            unit: null,
            notes: null,
            isOptional: false,
          },
        ],
      }),
    );
    expect(text).toContain('Salt');
  });
});
