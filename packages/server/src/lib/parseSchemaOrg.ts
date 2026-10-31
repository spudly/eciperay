import type {CheerioAPI} from 'cheerio';
import type {IngredientInput, RecipeImport} from '@eciperay/types';

import {
  parseIngredientAmount,
  parseIngredientText,
} from './parseIngredientText.js';

type SchemaRecipe = {
  '@type': string;
  'name'?: string;
  'description'?: string;
  'recipeYield'?: string | number;
  'prepTime'?: string;
  'cookTime'?: string;
  'recipeIngredient'?: string[];
  'recipeInstructions'?: ({text?: string} | string)[];
};

const parseDuration = (iso?: string): number | null => {
  if (!iso) {
    return null;
  }
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!match) {
    return null;
  }
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  return hours * 60 + minutes;
};

const toInstructionText = (step: {text?: string} | string): string =>
  typeof step === 'string' ? step : (step.text ?? '');

const toIngredient = (raw: string, i: number): IngredientInput => {
  const parsed = parseIngredientText(raw);
  return {
    sortOrder: i,
    name: parsed.name,
    quantity: parsed.quantity,
    unit: parsed.unit,
    notes: parsed.notes,
    isOptional: false,
  };
};

const normalizeForMatch = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();

/**
 * Two ingredient names match only when they are exactly equal after
 * normalization — a prefix match (e.g. "milk" vs "milk chocolate") is not
 * identity evidence for selecting a WPRM card.
 */
const ingredientNamesMatch = (a: string, b: string): boolean => {
  const left = normalizeForMatch(a);
  const right = normalizeForMatch(b);
  if (!left || !right) {
    return false;
  }
  return left === right;
};

/**
 * WP Recipe Maker renders each ingredient as separate amount / unit / name /
 * notes spans, which is more faithful than the flat schema.org strings (it
 * keeps WPRM's own unit classification, e.g. "medium" or "handful"). When a
 * page carries that markup, prefer it over the JSON-LD ingredient strings.
 */
const parseWprmIngredients = (
  $: CheerioAPI,
  recipe: SchemaRecipe,
): IngredientInput[] | null => {
  const expected = recipe.recipeIngredient;
  // A page can carry several WPRM cards (e.g. a sauce recipe embedded in a
  // post about another dish), and the first card is not necessarily the
  // JSON-LD recipe selected above. A card is used only when its identity
  // matches that recipe — by its rendered recipe name, or by a majority of
  // its ingredient names matching the selected recipe's parsed ingredient
  // names. When no card can be matched, fall back to the JSON-LD strings.
  const containers = $('.wprm-recipe-container').toArray();
  const cardItems = containers.length
    ? containers.map(container =>
        $(container).find('.wprm-recipe-ingredient').toArray(),
      )
    : [$('.wprm-recipe-ingredient').toArray()];
  const expectedNames = (expected ?? []).map(
    raw => parseIngredientText(raw).name,
  );
  let items: (typeof cardItems)[number] | null = null;
  for (const [index, candidate] of cardItems.entries()) {
    if (
      candidate.length === 0 ||
      (expected !== undefined && candidate.length !== expected.length)
    ) {
      continue;
    }
    if (expected === undefined || containers.length === 0) {
      items = candidate;
      break;
    }
    const container = containers[index];
    /* c8 ignore next 3 -- index is bounded by the containers array */
    const heading = container
      ? $(container).find('.wprm-recipe-name').first().text()
      : '';
    const headingMatches =
      !!recipe.name &&
      !!normalizeForMatch(heading) &&
      normalizeForMatch(heading) === normalizeForMatch(recipe.name);
    if (!headingMatches) {
      const matchingNames = candidate.filter((el, i) =>
        ingredientNamesMatch(
          $(el).find('.wprm-recipe-ingredient-name').first().text(),
          /* c8 ignore next -- candidate and expected lengths are equality-checked above */
          expectedNames[i] ?? '',
        ),
      ).length;
      if (matchingNames * 2 <= candidate.length) {
        continue;
      }
    }
    items = candidate;
    break;
  }
  if (!items) {
    return null;
  }
  const ingredients = items.map((el, i): IngredientInput => {
    const $el = $(el);
    const amountText = $el
      .find('.wprm-recipe-ingredient-amount')
      .first()
      .text()
      .trim();
    const amount = parseIngredientAmount(amountText);
    const unit = $el.find('.wprm-recipe-ingredient-unit').first().text().trim();
    const name = $el.find('.wprm-recipe-ingredient-name').first().text().trim();
    const wprmNotes = $el
      .find('.wprm-recipe-ingredient-notes')
      .first()
      .text()
      .trim()
      .replace(/^\((.*)\)$/s, '$1')
      .trim();
    // Combine what the amount span carries (a range, or text that does not
    // parse as an amount) with the WPRM notes instead of dropping one.
    const notes =
      [
        amount.notes ??
          (amount.quantity === null && amountText ? amountText : null),
        wprmNotes || null,
      ]
        .filter(Boolean)
        .join('; ') || null;
    return {
      sortOrder: i,
      name,
      quantity: amount.quantity,
      unit: unit ? unit.toLowerCase() : null,
      notes,
      isOptional: false,
    };
  });
  if (ingredients.some(ingredient => !ingredient.name)) {
    return null;
  }
  return ingredients;
};

const toRecipeImport = (recipe: SchemaRecipe, $: CheerioAPI): RecipeImport => ({
  title: recipe.name ?? 'Imported Recipe',
  description: recipe.description ?? null,
  servings: Number(recipe.recipeYield ?? 4) || 4,
  prepTimeMin: parseDuration(recipe.prepTime ?? ''),
  cookTimeMin: parseDuration(recipe.cookTime ?? ''),
  sourceUrl: null,
  ingredients:
    parseWprmIngredients($, recipe) ??
    (recipe.recipeIngredient ?? []).map(toIngredient),
  instructions: (recipe.recipeInstructions ?? []).map((s, i) => ({
    stepNumber: i + 1,
    body: toInstructionText(s),
  })),
});

const findRecipeInJson = (raw: string): SchemaRecipe | null => {
  const json = JSON.parse(raw) as SchemaRecipe | {['@graph']?: SchemaRecipe[]};
  /* c8 ignore next 3 -- @graph with undefined value is an unusual edge case */
  const candidates: SchemaRecipe[] =
    '@graph' in json ? (json['@graph'] ?? []) : [json as SchemaRecipe];
  return candidates.find(c => c['@type'] === 'Recipe') ?? null;
};

export const parseSchemaOrg = ($: CheerioAPI): RecipeImport | null => {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    try {
      /* c8 ignore next -- cheerio .html() returns null only for detached nodes */
      const recipe = findRecipeInJson($(el).html() ?? '');
      if (recipe) {
        return toRecipeImport(recipe, $);
      }
    } catch {
      continue;
    }
  }
  return null;
};
