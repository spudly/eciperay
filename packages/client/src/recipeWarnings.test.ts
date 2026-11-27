import {computeRecipeWarnings, hasRecipeWarnings} from './recipeWarnings.js';
import {makeRecipeDetail} from './test/fixtures/recipe.js';

const recipeWith = (
  ingredients: {id: string; name: string}[],
  instructions: {body: string; ingredientReferences?: string[]}[],
) =>
  makeRecipeDetail({
    ingredients: ingredients.map((ingredient, index) => ({
      id: ingredient.id,
      recipeVersionId: 'version-uuid-1',
      sortOrder: index,
      name: ingredient.name,
      quantity: null,
      unit: null,
      notes: null,
      isOptional: false,
    })),
    instructions: instructions.map((instruction, index) => ({
      id: `ins-${index + 1}`,
      recipeVersionId: 'version-uuid-1',
      stepNumber: index + 1,
      body: instruction.body,
      estimatedDurationMin: null,
      ingredientReferences: instruction.ingredientReferences ?? [],
    })),
  });

describe('computeRecipeWarnings — unmentioned ingredients', () => {
  test('warns for a listed ingredient no step mentions', () => {
    const warnings = computeRecipeWarnings(
      recipeWith(
        [
          {id: 'i-1', name: 'Flour'},
          {id: 'i-2', name: 'Cocoa powder'},
        ],
        [{body: 'Whisk the flour into a dough.'}],
      ),
    );
    expect(warnings).toEqual([
      {kind: 'unmentioned-ingredient', ingredientName: 'Cocoa powder'},
    ]);
  });

  test('a stored link counts as a mention (collective reference)', () => {
    const warnings = computeRecipeWarnings(
      recipeWith(
        [{id: 'i-1', name: 'Flour'}],
        [{body: 'Add the dry ingredients.', ingredientReferences: ['i-1']}],
      ),
    );
    expect(warnings).toEqual([]);
  });

  test('plural and preparation-word tolerant mentions do not warn', () => {
    const warnings = computeRecipeWarnings(
      recipeWith(
        [
          {id: 'i-1', name: 'Finely chopped onion'},
          {id: 'i-2', name: 'Tomatoes'},
        ],
        [{body: 'Saute the onions, then add the tomato.'}],
      ),
    );
    expect(warnings).toEqual([]);
  });

  test('unnamed draft rows never warn', () => {
    const warnings = computeRecipeWarnings(
      recipeWith([{id: 'i-1', name: '  '}], [{body: 'Preheat the oven.'}]),
    );
    expect(warnings).toEqual([]);
  });
});

describe('computeRecipeWarnings — missing ingredients', () => {
  test('warns for a step mentioning an ingredient not on the list', () => {
    const warnings = computeRecipeWarnings(
      recipeWith(
        [{id: 'i-1', name: 'Flour'}],
        [{body: 'Whisk the flour, then fold in the butter.'}],
      ),
    );
    expect(warnings).toEqual([
      {kind: 'missing-ingredient', ingredientName: 'butter', stepNumber: 1},
    ]);
  });

  test('a listed variant covers the lexicon term', () => {
    const warnings = computeRecipeWarnings(
      recipeWith(
        [
          {id: 'i-1', name: 'Flour'},
          {id: 'i-2', name: 'Salted butter'},
        ],
        [{body: 'Whisk the flour, then fold in the butter.'}],
      ),
    );
    expect(warnings).toEqual([]);
  });

  test('multi-word lexicon terms match and report the first step', () => {
    const warnings = computeRecipeWarnings(
      recipeWith(
        [{id: 'i-1', name: 'Flour'}],
        [
          {body: 'Whisk the flour.'},
          {body: 'Drizzle with olive oil and more olive oil.'},
        ],
      ),
    );
    expect(warnings).toEqual([
      {kind: 'missing-ingredient', ingredientName: 'olive oil', stepNumber: 2},
    ]);
  });

  test('generic prose words do not warn', () => {
    const warnings = computeRecipeWarnings(
      recipeWith(
        [{id: 'i-1', name: 'Flour'}],
        [{body: 'Mix the flour into a smooth dough and let the mixture rest.'}],
      ),
    );
    expect(warnings).toEqual([]);
  });
});

describe('hasRecipeWarnings', () => {
  test('mirrors computeRecipeWarnings emptiness', () => {
    expect(
      hasRecipeWarnings(
        recipeWith([{id: 'i-1', name: 'Flour'}], [{body: 'Add flour.'}]),
      ),
    ).toBe(false);
    expect(
      hasRecipeWarnings(
        recipeWith([{id: 'i-1', name: 'Flour'}], [{body: 'Preheat.'}]),
      ),
    ).toBe(true);
  });
});
