import type {RecipeDetail} from '@eciperay/types';

/**
 * Recipe warnings (#643 warnings tranche — Stephen's 2026-11-21
 * amendments to the #643 plan).
 *
 * Recipe owners see warnings about a recipe whenever they view it,
 * and recipe lists show a very small warning indicator on the
 * card/row. Two warning kinds:
 *
 * 1. `unmentioned-ingredient` — an ingredient on the list that the
 *    instructions never mention. An ingredient counts as mentioned
 *    when a step links it (`ingredientReferences`, tranches 1–2: the
 *    AI linking pass links collective/pronoun references text
 *    matching cannot see) OR when its name is mentioned in a step's
 *    text (the deterministic mention rule below, mirroring the
 *    server matcher's normalization in
 *    `packages/server/src/lib/matchInstructionIngredients.ts`).
 *    Counting both keeps legacy recipes with no stored links from
 *    warning on every ingredient their steps plainly name.
 * 2. `missing-ingredient` — an instruction mentioning an ingredient
 *    that is not on the list. Detected against a curated lexicon of
 *    common ingredient names: a lexicon term appearing in a step's
 *    text warns unless a listed ingredient covers it. This is the
 *    deterministic floor; the AI linking pass at generate/import/save
 *    time (tranche 2b) remains the layer that understands collective
 *    and pronoun references.
 *
 * Pure and host-shared so the web and app detail pages and lists
 * cannot drift on what counts as a warning.
 */

export type RecipeWarning =
  | {
      kind: 'unmentioned-ingredient';
      /** The listed ingredient's display name. */
      ingredientName: string;
    }
  | {
      kind: 'missing-ingredient';
      /** The mentioned ingredient's lexicon display name. */
      ingredientName: string;
      /** 1-based step number of the first step mentioning it. */
      stepNumber: number;
    };

type WarnableRecipe = Pick<RecipeDetail, 'ingredients' | 'instructions'>;

/** Preparation words: how an ingredient is prepared, not what it is. */
const PREPARATION_WORDS = new Set([
  'beaten',
  'chopped',
  'coarsely',
  'crushed',
  'cubed',
  'diced',
  'divided',
  'finely',
  'fresh',
  'freshly',
  'grated',
  'halved',
  'julienned',
  'melted',
  'minced',
  'peeled',
  'quartered',
  'roughly',
  'shredded',
  'sliced',
  'softened',
  'thinly',
  'torn',
  'trimmed',
  'washed',
]);

/** Color/variety qualifiers: a variant of an ingredient, not a different one. */
const QUALIFIER_WORDS = new Set([
  'black',
  'brown',
  'golden',
  'green',
  'orange',
  'purple',
  'red',
  'salted',
  'unsalted',
  'white',
  'yellow',
]);

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (text: string): string[] => {
  const normalized = normalizeText(text);
  return normalized === '' ? [] : normalized.split(' ');
};

/** Singular form of a token, for plural-tolerant comparison. */
const singularize = (token: string): string => {
  if (
    token.endsWith('oes') ||
    token.endsWith('ches') ||
    token.endsWith('shes')
  ) {
    return token.slice(0, -2);
  }
  if (token.endsWith('ies') && token.length > 3) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 1) {
    return token.slice(0, -1);
  }
  return token;
};

const tokenForms = (token: string): Set<string> =>
  new Set([token, singularize(token)]);

/** Significant tokens of an ingredient name: preparation and qualifier words removed. */
const ingredientNameTokens = (name: string): string[] => {
  const tokens = tokenize(name).filter(
    token => !PREPARATION_WORDS.has(token) && !QUALIFIER_WORDS.has(token),
  );
  return tokens.length > 0 ? tokens : tokenize(name);
};

const formsOf = (tokens: string[]): Set<string> => {
  const forms = new Set<string>();
  for (const token of tokens) {
    for (const form of tokenForms(token)) forms.add(form);
  }
  return forms;
};

const allTokensPresent = (tokens: string[], present: Set<string>): boolean =>
  tokens.length > 0 &&
  tokens.every(token => [...tokenForms(token)].some(form => present.has(form)));

/**
 * Common ingredient names for the missing-ingredient check, as
 * display name → significant tokens. Deliberately concrete foods and
 * pantry staples only: generic words ("sauce", "mixture", "dough")
 * would false-positive on ordinary instruction prose.
 */
const MISSING_INGREDIENT_LEXICON: readonly string[] = [
  'bacon',
  'baking powder',
  'baking soda',
  'basil',
  'bay leaves',
  'beef',
  'bell pepper',
  'black beans',
  'bread',
  'broccoli',
  'brown sugar',
  'butter',
  'cabbage',
  'canola oil',
  'carrot',
  'cauliflower',
  'celery',
  'cheese',
  'chicken',
  'chicken broth',
  'chicken stock',
  'chili powder',
  'cilantro',
  'cinnamon',
  'cocoa powder',
  'coconut milk',
  'coconut oil',
  'corn',
  'cornstarch',
  'cream',
  'cream cheese',
  'cucumber',
  'cumin',
  'egg',
  'flour',
  'garlic',
  'ginger',
  'ground beef',
  'ground turkey',
  'ham',
  'heavy cream',
  'honey',
  'lemon juice',
  'lemon zest',
  'lettuce',
  'lime juice',
  'maple syrup',
  'mayonnaise',
  'milk',
  'mushroom',
  'mustard',
  'nutmeg',
  'oats',
  'olive oil',
  'onion',
  'oregano',
  'paprika',
  'parmesan',
  'parsley',
  'pasta',
  'peanut butter',
  'peas',
  'pecans',
  'pineapple',
  'pork',
  'potato',
  'powdered sugar',
  'quinoa',
  'raisins',
  'rice',
  'salmon',
  'sausage',
  'sesame oil',
  'shallot',
  'shrimp',
  'sour cream',
  'soy sauce',
  'spinach',
  'sugar',
  'sweet potato',
  'thyme',
  'tomato',
  'tomato paste',
  'tomato sauce',
  'tortilla',
  'tuna',
  'vanilla extract',
  'vegetable broth',
  'vegetable oil',
  'vegetable stock',
  'vinegar',
  'walnuts',
  'yeast',
  'zucchini',
];

const lexiconEntries = MISSING_INGREDIENT_LEXICON.map(name => ({
  name,
  tokens: ingredientNameTokens(name),
})).sort((a, b) => b.tokens.length - a.tokens.length);

/** True when a listed ingredient's name covers a lexicon term (or vice versa). */
const lexiconTermCovered = (
  termTokens: string[],
  listedTokenSets: string[][],
): boolean =>
  listedTokenSets.some(listed => {
    const listedForms = formsOf(listed);
    const termForms = formsOf(termTokens);
    return (
      allTokensPresent(termTokens, listedForms) ||
      allTokensPresent(listed, termForms)
    );
  });

export const computeRecipeWarnings = (
  recipe: WarnableRecipe,
): RecipeWarning[] => {
  const warnings: RecipeWarning[] = [];
  const ingredients = recipe.ingredients.filter(
    ingredient => ingredient.name.trim().length > 0,
  );
  const instructions = [...recipe.instructions].sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );

  const referencedIds = new Set(
    instructions.flatMap(instruction => instruction.ingredientReferences ?? []),
  );
  const allStepForms = formsOf(
    instructions.flatMap(instruction => tokenize(instruction.body)),
  );

  // Kind 1: listed but never mentioned (by link or by text).
  for (const ingredient of ingredients) {
    if (referencedIds.has(ingredient.id)) continue;
    const tokens = ingredientNameTokens(ingredient.name);
    if (!allTokensPresent(tokens, allStepForms)) {
      warnings.push({
        kind: 'unmentioned-ingredient',
        ingredientName: ingredient.name,
      });
    }
  }

  // Kind 2: mentioned in a step but not on the list.
  const listedTokenSets = ingredients.map(ingredient =>
    ingredientNameTokens(ingredient.name),
  );
  const warnedTerms = new Set<string>();
  for (const instruction of instructions) {
    const stepForms = formsOf(tokenize(instruction.body));
    for (const entry of lexiconEntries) {
      if (warnedTerms.has(entry.name)) continue;
      if (!allTokensPresent(entry.tokens, stepForms)) continue;
      if (lexiconTermCovered(entry.tokens, listedTokenSets)) continue;
      warnedTerms.add(entry.name);
      warnings.push({
        kind: 'missing-ingredient',
        ingredientName: entry.name,
        stepNumber: instruction.stepNumber,
      });
    }
  }

  return warnings;
};

export const hasRecipeWarnings = (recipe: WarnableRecipe): boolean =>
  computeRecipeWarnings(recipe).length > 0;

/** The very small list indicator: appended to a warned recipe's list subtitle. */
export const RECIPE_WARNING_INDICATOR = '⚠';
