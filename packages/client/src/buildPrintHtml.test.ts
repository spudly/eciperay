import {makeRecipeDetail, VERSION_ID} from './test/fixtures/recipe.js';
import {buildPrintHtml} from './buildPrintHtml.js';

describe('buildPrintHtml', () => {
  test('includes recipe title', () => {
    const html = buildPrintHtml(makeRecipeDetail({title: 'Tasty Pasta'}));
    expect(html).toContain('Tasty Pasta');
  });

  test('includes ingredient names', () => {
    expect(buildPrintHtml(makeRecipeDetail())).toContain('Flour');
  });

  test('includes instruction steps', () => {
    expect(buildPrintHtml(makeRecipeDetail())).toContain('Mix dry ingredients');
  });

  test('handles null prep and cook times', () => {
    expect(
      buildPrintHtml(makeRecipeDetail({prepTimeMin: null, cookTimeMin: null})),
    ).toContain('4 servings');
  });

  test('includes ingredient notes and description', () => {
    const html = buildPrintHtml(
      makeRecipeDetail({
        description: 'Yummy',
        ingredients: [
          {
            id: 'i-1',
            recipeVersionId: VERSION_ID,
            sortOrder: 0,
            name: 'Sugar',
            quantity: 1,
            unit: 'cup',
            notes: 'fine',
            isOptional: false,
          },
        ],
      }),
    );
    expect(html).toContain('Yummy');
    expect(html).toContain('(fine)');
  });

  test('omits description when null', () => {
    const html = buildPrintHtml(makeRecipeDetail({description: null}));
    expect(html).not.toContain('A test recipe');
  });

  test('includes only prep time when cook time is null', () => {
    const html = buildPrintHtml(
      makeRecipeDetail({prepTimeMin: 10, cookTimeMin: null}),
    );
    expect(html).toContain('Prep: 10 min');
    expect(html).not.toContain('Cook:');
  });

  test('omits quantity prefix when ingredient quantity is null', () => {
    const html = buildPrintHtml(
      makeRecipeDetail({
        ingredients: [
          {
            id: 'i-1',
            recipeVersionId: VERSION_ID,
            sortOrder: 0,
            name: 'Salt',
            quantity: null,
            unit: 'tsp',
            notes: null,
            isOptional: false,
          },
        ],
      }),
    );
    expect(html).toContain('Salt</li>');
    expect(html).not.toContain('null');
  });

  test('renders quantity without unit when unit is null', () => {
    const html = buildPrintHtml(
      makeRecipeDetail({
        ingredients: [
          {
            id: 'i-1',
            recipeVersionId: VERSION_ID,
            sortOrder: 0,
            name: 'Eggs',
            quantity: 3,
            unit: null,
            notes: null,
            isOptional: false,
          },
        ],
      }),
    );
    expect(html).toContain('3 Eggs');
  });
});
