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

  test('splits amount and unit out of JSON-LD ingredient strings', () => {
    const html = makeHtml(
      JSON.stringify({
        '@type': 'Recipe',
        'name': 'Cucumber Crunch Salad',
        'recipeYield': '4',
        'recipeIngredient': [
          '1/4 cup dill, fresh chopped',
          '200g pasta',
          '1 1/2 tbsp honey',
          'Salt and pepper to taste',
        ],
        'recipeInstructions': [],
      }),
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toEqual([
      {
        sortOrder: 0,
        name: 'dill, fresh chopped',
        quantity: 0.25,
        unit: 'cup',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 1,
        name: 'pasta',
        quantity: 200,
        unit: 'g',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 2,
        name: 'honey',
        quantity: 1.5,
        unit: 'tbsp',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 3,
        name: 'Salt and pepper to taste',
        quantity: null,
        unit: null,
        notes: null,
        isOptional: false,
      },
    ]);
  });
});

const WPRM_HTML = `<html><head>
<script type="application/ld+json">
{"@type":"Recipe","name":"Cucumber Crunch Salad","recipeYield":"4",
"recipeIngredient":["1 medium avocado, pitted and peeled","2 tbsp lemon juice, fresh","1/4 cup dill, fresh chopped","Hey Old Sport Overachiever to taste","1-2 tbsp honey","1/2 red onion, sliced"],
"recipeInstructions":[{"text":"Toss everything"}]}
</script></head><body>
<div class="wprm-recipe-container">
<ul class="wprm-recipe-ingredients">
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">1</span> <span class="wprm-recipe-ingredient-unit">medium</span> <span class="wprm-recipe-ingredient-name">avocado, pitted and peeled</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">2</span> <span class="wprm-recipe-ingredient-unit">tbsp</span> <span class="wprm-recipe-ingredient-name">lemon juice, fresh</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">1/4</span> <span class="wprm-recipe-ingredient-unit">cup</span> <span class="wprm-recipe-ingredient-name">dill, fresh chopped</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-name">Hey Old Sport Overachiever to taste</span> <span class="wprm-recipe-ingredient-notes">(can substitute salt)</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">1-2</span> <span class="wprm-recipe-ingredient-unit">tbsp</span> <span class="wprm-recipe-ingredient-name">honey</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">1/2</span> <span class="wprm-recipe-ingredient-name">red onion, sliced</span></li>
</ul>
</div>
</body></html>`;

describe('parseSchemaOrg with WP Recipe Maker markup', () => {
  test('uses the WPRM amount/unit/name/notes spans when present', () => {
    const $ = load(WPRM_HTML);
    const result = parseSchemaOrg($);
    expect(result?.title).toBe('Cucumber Crunch Salad');
    expect(result?.ingredients).toEqual([
      {
        sortOrder: 0,
        name: 'avocado, pitted and peeled',
        quantity: 1,
        unit: 'medium',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 1,
        name: 'lemon juice, fresh',
        quantity: 2,
        unit: 'tbsp',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 2,
        name: 'dill, fresh chopped',
        quantity: 0.25,
        unit: 'cup',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 3,
        name: 'Hey Old Sport Overachiever to taste',
        quantity: null,
        unit: null,
        notes: 'can substitute salt',
        isOptional: false,
      },
      {
        sortOrder: 4,
        name: 'honey',
        quantity: 1,
        unit: 'tbsp',
        notes: '1-2',
        isOptional: false,
      },
      {
        sortOrder: 5,
        name: 'red onion, sliced',
        quantity: 0.5,
        unit: null,
        notes: null,
        isOptional: false,
      },
    ]);
  });

  test('ignores ingredients from a second WPRM card on the page', () => {
    const html = WPRM_HTML.replace(
      '</body>',
      '<div class="wprm-recipe-container"><ul><li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">flour, for the second recipe</span></li></ul></div></body>',
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toHaveLength(6);
    expect(result?.ingredients[3]?.notes).toBe('can substitute salt');
  });

  test('skips a different WPRM card placed first with the same ingredient count', () => {
    const foreignCard = `<div class="wprm-recipe-container"><ul>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">flour</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">sugar</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">cocoa</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">butter</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">eggs</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">milk</span></li>
</ul></div>`;
    const html = WPRM_HTML.replace(
      '<div class="wprm-recipe-container">',
      `${foreignCard}\n<div class="wprm-recipe-container">`,
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toHaveLength(6);
    expect(result?.ingredients[0]?.name).toBe('avocado, pitted and peeled');
    expect(result?.ingredients[3]?.notes).toBe('can substitute salt');
  });

  test('falls back to the JSON-LD strings when the only WPRM card is a different recipe', () => {
    const html = WPRM_HTML.replace('>avocado, pitted and peeled<', '>flour<')
      .replace('>lemon juice, fresh<', '>sugar<')
      .replace('>dill, fresh chopped<', '>cocoa<')
      .replace('>Hey Old Sport Overachiever to taste<', '>butter<')
      .replace('>honey<', '>eggs<')
      .replace('>red onion, sliced<', '>milk<');
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toHaveLength(6);
    expect(result?.ingredients[0]).toEqual({
      sortOrder: 0,
      name: 'avocado, pitted and peeled',
      quantity: 1,
      unit: 'medium',
      notes: null,
      isOptional: false,
    });
    // The WPRM-only notes span must not leak in from the other recipe's card.
    expect(result?.ingredients[3]?.notes).toBeNull();
  });

  test('does not select a WPRM card whose names only prefix-match', () => {
    // Every name on this foreign card extends an expected name by a suffix,
    // so prefix matching would count all six as identity evidence.
    const foreignCard = `<div class="wprm-recipe-container"><ul>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">avocado, pitted and peeled, extra</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">lemon juice, freshly squeezed</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">dill, fresh chopped, extra</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">Hey Old Sport Overachiever to taste, extra</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">honey, extra</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">9</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">red onion, sliced, extra</span></li>
</ul></div>`;
    const html = WPRM_HTML.replace(
      '<div class="wprm-recipe-container">',
      `${foreignCard}\n<div class="wprm-recipe-container">`,
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toHaveLength(6);
    expect(result?.ingredients[0]?.name).toBe('avocado, pitted and peeled');
    expect(result?.ingredients[0]?.quantity).toBe(1);
  });

  test('matches a WPRM card whose name and ingredients are non-Latin', () => {
    const html = `<html><head>
<script type="application/ld+json">
{"@type":"Recipe","name":"Салат Цезарь","recipeYield":"4",
"recipeIngredient":["200 молоко","2 яйца"],
"recipeInstructions":[{"text":"Смешать"}]}
</script></head><body>
<div class="wprm-recipe-container"><h2 class="wprm-recipe-name">Салат Цезарь</h2>
<ul class="wprm-recipe-ingredients">
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">200</span> <span class="wprm-recipe-ingredient-unit">мл</span> <span class="wprm-recipe-ingredient-name">молоко</span></li>
<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">2</span> <span class="wprm-recipe-ingredient-unit">шт</span> <span class="wprm-recipe-ingredient-name">яйца</span></li>
</ul>
</div>
</body></html>`;
    const $ = load(html);
    const result = parseSchemaOrg($);
    // The WPRM spans are used (units survive); the JSON-LD fallback would
    // have produced unit: null for both ingredients.
    expect(result?.ingredients).toEqual([
      {
        sortOrder: 0,
        name: 'молоко',
        quantity: 200,
        unit: 'мл',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 1,
        name: 'яйца',
        quantity: 2,
        unit: 'шт',
        notes: null,
        isOptional: false,
      },
    ]);
  });

  test('matches a WPRM card by its rendered recipe name heading', () => {
    const card = (heading: string, names: string[]) =>
      `<div class="wprm-recipe-container"><h2 class="wprm-recipe-name">${heading}</h2><ul>${names
        .map(
          name =>
            `<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">3</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">${name}</span></li>`,
        )
        .join('')}</ul></div>`;
    const html = WPRM_HTML.replace(
      /<div class="wprm-recipe-container">[\s\S]*<\/body>/,
      `${card('Some Other Dish', ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'])}${card(
        'Cucumber Crunch Salad',
        ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
      )}</body>`,
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients.map(ingredient => ingredient.name)).toEqual([
      'b1',
      'b2',
      'b3',
      'b4',
      'b5',
      'b6',
    ]);
  });

  test('uses WPRM spans without a container element', () => {
    const html = WPRM_HTML.replace(
      '<div class="wprm-recipe-container">',
      '',
    ).replace('</ul>\n</div>', '</ul>');
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toHaveLength(6);
    expect(result?.ingredients[3]?.notes).toBe('can substitute salt');
  });

  test('uses the WPRM card when the JSON-LD recipe lists no ingredients', () => {
    const html = WPRM_HTML.replace(/"recipeIngredient":\[[^\]]*\],/, '');
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toHaveLength(6);
    expect(result?.ingredients[0]?.name).toBe('avocado, pitted and peeled');
  });

  test('falls back to the JSON-LD strings when the WPRM list is incomplete', () => {
    const html = WPRM_HTML.replace(
      '<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">1/2</span> <span class="wprm-recipe-ingredient-name">red onion, sliced</span></li>\n',
      '',
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toHaveLength(6);
    expect(result?.ingredients[3]?.notes).toBeNull();
    expect(result?.ingredients[5]).toEqual({
      sortOrder: 5,
      name: 'red onion, sliced',
      quantity: 0.5,
      unit: null,
      notes: null,
      isOptional: false,
    });
  });

  test('combines a range amount with the WPRM notes instead of dropping it', () => {
    const html = WPRM_HTML.replace(
      '<span class="wprm-recipe-ingredient-name">honey</span>',
      '<span class="wprm-recipe-ingredient-name">honey</span> <span class="wprm-recipe-ingredient-notes">(chopped)</span>',
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients[4]?.quantity).toBe(1);
    expect(result?.ingredients[4]?.notes).toBe('1-2; chopped');
  });

  test('preserves an unparseable WPRM amount as notes', () => {
    const html = WPRM_HTML.replace(
      '<span class="wprm-recipe-ingredient-amount">2</span>',
      '<span class="wprm-recipe-ingredient-amount">a few</span>',
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients[1]?.quantity).toBeNull();
    expect(result?.ingredients[1]?.notes).toBe('a few');
  });

  test('falls back to the JSON-LD strings when a WPRM item has no name', () => {
    const html = WPRM_HTML.replace(
      '<span class="wprm-recipe-ingredient-name">honey</span>',
      '',
    );
    const $ = load(html);
    const result = parseSchemaOrg($);
    expect(result?.ingredients).toHaveLength(6);
    expect(result?.ingredients[4]).toEqual({
      sortOrder: 4,
      name: 'honey',
      quantity: 1,
      unit: 'tbsp',
      notes: '1-2',
      isOptional: false,
    });
  });
});
