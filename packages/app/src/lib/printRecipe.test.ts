import Print from 'react-native-print';

import {makeRecipeDetail, VERSION_ID} from '../__tests__/fixtures/recipe';

import {printRecipe} from './printRecipe';

describe('printRecipe', () => {
  test('calls Print.print with an HTML string containing the recipe title', async () => {
    const recipe = makeRecipeDetail({title: 'Tasty Pasta'});
    await printRecipe(recipe);
    expect(Print.print).toHaveBeenCalledWith(
      expect.objectContaining({html: expect.stringContaining('Tasty Pasta')}),
    );
  });

  test('HTML includes ingredient names', async () => {
    const recipe = makeRecipeDetail();
    await printRecipe(recipe);
    const {html} = (Print.print as jest.Mock).mock.calls[0][0];
    expect(html).toContain('Flour');
  });

  test('HTML includes instruction steps', async () => {
    const recipe = makeRecipeDetail();
    await printRecipe(recipe);
    const {html} = (Print.print as jest.Mock).mock.calls[0][0];
    expect(html).toContain('Mix dry ingredients');
  });

  test('handles recipe with null prepTime and cookTime', async () => {
    const recipe = makeRecipeDetail({prepTimeMin: null, cookTimeMin: null});
    await expect(printRecipe(recipe)).resolves.not.toThrow();
  });

  test('HTML includes notes when ingredient has notes', async () => {
    const recipe = makeRecipeDetail({
      ingredients: [
        {
          id: 'i-1',
          recipeVersionId: VERSION_ID,
          sortOrder: 0,
          name: 'Flour',
          quantity: 2,
          unit: 'cups',
          notes: 'sifted',
          isOptional: false,
        },
      ],
    });
    await printRecipe(recipe);
    const {html} = (Print.print as jest.Mock).mock.calls[0][0];
    expect(html).toContain('sifted');
  });

  test('HTML includes description when present', async () => {
    const recipe = makeRecipeDetail({description: 'A delightful cake'});
    await printRecipe(recipe);
    const {html} = (Print.print as jest.Mock).mock.calls[0][0];
    expect(html).toContain('A delightful cake');
  });

  test('handles ingredient with null quantity', async () => {
    const recipe = makeRecipeDetail({
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
    });
    await expect(printRecipe(recipe)).resolves.not.toThrow();
  });

  test('handles ingredient with quantity but null unit (covers ?? empty string branch)', async () => {
    const recipe = makeRecipeDetail({
      ingredients: [
        {
          id: 'i-3',
          recipeVersionId: VERSION_ID,
          sortOrder: 0,
          name: 'Eggs',
          quantity: 3,
          unit: null,
          notes: null,
          isOptional: false,
        },
      ],
    });
    await printRecipe(recipe);
    const {html} = (Print.print as jest.Mock).mock.calls[0][0];
    expect(html).toContain('Eggs');
  });

  test('omits description paragraph when null', async () => {
    const recipe = makeRecipeDetail({description: null});
    await printRecipe(recipe);
    const {html} = (Print.print as jest.Mock).mock.calls[0][0];
    expect(html).not.toContain('<p>');
  });
});
