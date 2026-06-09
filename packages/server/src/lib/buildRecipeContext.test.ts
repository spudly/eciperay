import {makeRecipeDetail} from '../test/fixtures/recipe.js';

import {buildRecipeContext} from './buildRecipeContext.js';

type ParsedContext = {
  title: string;
  servings: number;
  ingredients: unknown[];
  instructions: unknown[];
};

describe('buildRecipeContext', () => {
  test('returns a JSON string', () => {
    const recipe = makeRecipeDetail();
    const result = buildRecipeContext(recipe);
    expect(typeof result).toBe('string');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  test('includes title, servings, ingredients, and instructions', () => {
    const recipe = makeRecipeDetail({title: 'Pasta', servings: 2});
    const parsed = JSON.parse(buildRecipeContext(recipe)) as ParsedContext;
    expect(parsed).toMatchObject({
      title: 'Pasta',
      servings: 2,
      ingredients: expect.any(Array),
      instructions: expect.any(Array),
    });
  });

  test('handles empty ingredients and instructions arrays', () => {
    const recipe = makeRecipeDetail({ingredients: [], instructions: []});
    const parsed = JSON.parse(buildRecipeContext(recipe)) as ParsedContext;
    expect(parsed.ingredients).toHaveLength(0);
    expect(parsed.instructions).toHaveLength(0);
  });
});
