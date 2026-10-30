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

/**
 * WP Recipe Maker renders each ingredient as separate amount / unit / name /
 * notes spans, which is more faithful than the flat schema.org strings (it
 * keeps WPRM's own unit classification, e.g. "medium" or "handful"). When a
 * page carries that markup, prefer it over the JSON-LD ingredient strings.
 */
const parseWprmIngredients = ($: CheerioAPI): IngredientInput[] | null => {
  const items = $('.wprm-recipe-ingredient').toArray();
  if (items.length === 0) {
    return null;
  }
  const ingredients = items.map((el, i): IngredientInput => {
    const $el = $(el);
    const amount = parseIngredientAmount(
      $el.find('.wprm-recipe-ingredient-amount').first().text().trim(),
    );
    const unit = $el.find('.wprm-recipe-ingredient-unit').first().text().trim();
    const name = $el.find('.wprm-recipe-ingredient-name').first().text().trim();
    const wprmNotes = $el
      .find('.wprm-recipe-ingredient-notes')
      .first()
      .text()
      .trim()
      .replace(/^\((.*)\)$/s, '$1')
      .trim();
    return {
      sortOrder: i,
      name,
      quantity: amount.quantity,
      unit: unit ? unit.toLowerCase() : null,
      notes: wprmNotes ? wprmNotes : amount.notes,
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
    parseWprmIngredients($) ??
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
