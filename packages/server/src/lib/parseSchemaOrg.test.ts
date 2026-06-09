import {load} from 'cheerio';

import {parseSchemaOrg} from './parseSchemaOrg.js';

const makeHtml = (json: string) =>
  `<html><head><script type="application/ld+json">${json}</script></head></html>`;

const RECIPE_JSON = JSON.stringify({
  '@type': 'Recipe',
  'name': 'Pasta',
  'recipeYield': '4',
  'recipeIngredient': ['200g pasta'],
  'recipeInstructions': [{text: 'Boil water'}],
});

describe('parseSchemaOrg', () => {
  test('returns a RecipeImport when HTML contains a valid Recipe JSON-LD', () => {
    const $ = load(makeHtml(RECIPE_JSON));
    const result = parseSchemaOrg($);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Pasta');
    expect(result?.servings).toBe(4);
    expect(result?.ingredients).toHaveLength(1);
  });

  test('returns null when no JSON-LD script tags are present', () => {
    const $ = load('<html><head></head></html>');
    expect(parseSchemaOrg($)).toBeNull();
  });

  test('returns null when JSON-LD exists but is not a Recipe type', () => {
    const $ = load(
      makeHtml(JSON.stringify({'@type': 'Organization', 'name': 'Acme'})),
    );
    expect(parseSchemaOrg($)).toBeNull();
  });

  test('handles the @graph wrapper', () => {
    const graphJson = JSON.stringify({'@graph': [JSON.parse(RECIPE_JSON)]});
    const $ = load(makeHtml(graphJson));
    const result = parseSchemaOrg($);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Pasta');
  });

  test('returns null (does not throw) when JSON-LD is malformed', () => {
    const $ = load(makeHtml('{ invalid json '));
    expect(parseSchemaOrg($)).toBeNull();
  });

  test('parses prepTime with only minutes (no hours)', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Quick Pasta',
        'recipeYield': '2',
        'prepTime': 'PT30M',
        'recipeIngredient': [],
        'recipeInstructions': [],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.prepTimeMin).toBe(30);
  });

  test('parses cookTime with hours and minutes', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Slow Roast',
        'recipeYield': '4',
        'cookTime': 'PT1H30M',
        'recipeIngredient': [],
        'recipeInstructions': [],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.cookTimeMin).toBe(90);
  });

  test('returns null duration for an invalid ISO string', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Test',
        'recipeYield': '2',
        'prepTime': 'not-iso',
        'recipeIngredient': [],
        'recipeInstructions': [],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.prepTimeMin).toBeNull();
  });

  test('parses cookTime with only hours (no minutes)', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Slow Cook',
        'recipeYield': '4',
        'cookTime': 'PT2H',
        'recipeIngredient': [],
        'recipeInstructions': [],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.cookTimeMin).toBe(120);
  });

  test('uses fallback title when name is missing', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'recipeYield': '2',
        'recipeIngredient': [],
        'recipeInstructions': [],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.title).toBe('Imported Recipe');
  });

  test('parses string instructions (not objects)', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Simple',
        'recipeYield': '1',
        'recipeIngredient': ['1 egg'],
        'recipeInstructions': ['Crack the egg', 'Cook it'],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.instructions[0]?.body).toBe('Crack the egg');
  });

  test('parses recipe with description', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Fancy Pasta',
        'description': 'A wonderful pasta dish',
        'recipeYield': '4',
        'recipeIngredient': [],
        'recipeInstructions': [],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.description).toBe('A wonderful pasta dish');
  });

  test('falls back to 4 servings when recipeYield is not a number', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Test',
        'recipeYield': 'a dozen',
        'recipeIngredient': [],
        'recipeInstructions': [],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.servings).toBe(4);
  });

  test('defaults to empty arrays when ingredients and instructions are missing', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Bare Recipe',
        'recipeYield': '2',
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toHaveLength(0);
    expect(result?.instructions).toHaveLength(0);
  });

  test('uses 4 as default when recipeYield is absent', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'No Yield',
        'recipeIngredient': [],
        'recipeInstructions': [],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.servings).toBe(4);
  });

  test('returns null when script element has empty content', () => {
    const emptyScript =
      '<html><head><script type="application/ld+json"></script></head></html>';
    const $ = load(emptyScript);
    expect(parseSchemaOrg($)).toBeNull();
  });

  test('handles instruction object with no text field (uses empty string fallback)', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Recipe',
        'recipeYield': '2',
        'recipeIngredient': [],
        'recipeInstructions': [{'@type': 'HowToStep'}],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.instructions[0]?.body).toBe('');
  });
});
