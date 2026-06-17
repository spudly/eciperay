import type {CheerioAPI} from 'cheerio';
import type {RecipeImport} from '@eciperay/types';

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

const toIngredient = (raw: string, i: number) => ({
  sortOrder: i,
  name: raw,
  quantity: null,
  unit: null,
  notes: null,
  isOptional: false,
});

const toRecipeImport = (recipe: SchemaRecipe): RecipeImport => ({
  title: recipe.name ?? 'Imported Recipe',
  description: recipe.description ?? null,
  servings: Number(recipe.recipeYield ?? 4) || 4,
  prepTimeMin: parseDuration(recipe.prepTime ?? ''),
  cookTimeMin: parseDuration(recipe.cookTime ?? ''),
  sourceUrl: null,
  ingredients: (recipe.recipeIngredient ?? []).map(toIngredient),
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
        return toRecipeImport(recipe);
      }
    } catch {
      continue;
    }
  }
  return null;
};
