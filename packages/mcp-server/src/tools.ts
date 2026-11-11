import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import type {EciperayClient} from './eciperayClient.js';

const textResult = (data: unknown) => ({
  content: [{type: 'text' as const, text: JSON.stringify(data, null, 2)}],
});

/**
 * Servings and quantity land in PostgreSQL `integer` columns. Values beyond
 * that range pass a plain int/positive check but fail at insert time — and the
 * server's meal/plan replacement writes delete the stored rows before
 * inserting, without a transaction, so an out-of-range value could erase stored
 * entries. Reject it here, before any API call.
 */
const pgIntSchema = z.number().int().positive().max(2_147_483_647);

const mealRecipeSchema = z.object({
  recipeId: z.uuid().describe('Recipe id, from search_recipes'),
  servings: pgIntSchema
    .optional()
    .describe('Servings of the recipe in the meal (defaults to the recipe’s)'),
});

/**
 * A meal's member recipes. Duplicate recipeIds are rejected before any API
 * call: the server's full-replace meal writes are not transactional, so a
 * duplicate would fail mid-write and could lose the stored member list (on
 * update) or leave a partially created meal (on create).
 */
const mealRecipeListSchema = z
  .array(mealRecipeSchema)
  .refine(
    recipes =>
      new Set(recipes.map(recipe => recipe.recipeId.toLowerCase())).size ===
      recipes.length,
    {
      message:
        'recipes must not contain the same recipeId more than once; combine the servings into a single entry instead',
    },
  );

/**
 * A meal's direct ingredients (#362): one-off entries stored on the meal
 * itself, not through a recipe. Nutrition is estimated server-side at save
 * time, so no nutrition fields exist here. Mirrors the server schema's caps
 * (name ≤ 200, unit ≤ 50, at most 50 entries — every entry costs one AI
 * nutrition estimate at save time).
 */
const mealIngredientSchema = z.object({
  name: z.string().min(1).max(200).describe('Ingredient name'),
  quantity: z
    .number()
    .positive()
    .nullable()
    .optional()
    .describe('Amount of the ingredient (omit when not applicable)'),
  unit: z
    .string()
    .min(1)
    .max(50)
    .nullable()
    .optional()
    .describe('Unit for the quantity, e.g. "g" or "bottle"'),
  servings: pgIntSchema
    .optional()
    .describe('Servings of the ingredient in the meal (default 1)'),
});

const mealIngredientListSchema = z
  .array(mealIngredientSchema)
  .max(50)
  .describe('Direct ingredients, in order');

const mealPlanEntrySchema = z.union([
  z.strictObject({
    mealId: z.uuid().describe('Meal id, from list_meals'),
    quantity: pgIntSchema
      .optional()
      .describe('How many times the meal appears (default 1)'),
  }),
  z.strictObject({
    recipeId: z.uuid().describe('Recipe id, from search_recipes'),
    servings: pgIntSchema
      .optional()
      .describe('Servings of the recipe (defaults to the recipe’s)'),
    quantity: pgIntSchema
      .optional()
      .describe('How many times the recipe appears (default 1)'),
  }),
]);

const planDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('Calendar date, YYYY-MM-DD');

const ingredientSchema = z.object({
  name: z.string().min(1).describe('Ingredient name, e.g. "all-purpose flour"'),
  quantity: z
    .number()
    .nullable()
    .optional()
    .describe('Numeric quantity, if known'),
  unit: z.string().nullable().optional().describe('Unit, e.g. "cups", "g"'),
  notes: z.string().nullable().optional().describe('Prep notes, e.g. "diced"'),
  isOptional: z
    .boolean()
    .optional()
    .describe('Whether the ingredient is optional'),
});

export const registerTools = (
  server: McpServer,
  client: EciperayClient,
): void => {
  server.registerTool(
    'search_recipes',
    {
      title: 'Search recipes',
      description:
        'Search your Eciperay recipe collection by keyword. Returns matching recipes with ids, titles, and summaries.',
      inputSchema: {
        query: z
          .string()
          .describe('Keyword to search across recipe titles and descriptions'),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe('Max results to return'),
        offset: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe('Results to skip for pagination'),
      },
    },
    async ({query, limit, offset}) =>
      textResult(await client.listRecipes({search: query, limit, offset})),
  );

  server.registerTool(
    'get_recipe',
    {
      title: 'Get recipe details',
      description:
        'Fetch the full details of a recipe: ingredients, instructions, nutrition, and ratings.',
      inputSchema: {id: z.string().describe('Recipe id, from search_recipes')},
    },
    async ({id}) => textResult(await client.getRecipe(id)),
  );

  server.registerTool(
    'create_recipe',
    {
      title: 'Create recipe',
      description: 'Save a new recipe to your Eciperay collection.',
      inputSchema: {
        title: z.string().min(1).describe('Recipe title'),
        servings: z.number().int().positive().describe('Number of servings'),
        ingredients: z
          .array(ingredientSchema)
          .min(1)
          .describe('Ingredients in order'),
        instructions: z
          .array(z.string().min(1))
          .min(1)
          .describe('Preparation steps in order'),
        description: z.string().optional().describe('Short description'),
        prepTimeMin: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe('Prep time in minutes'),
        cookTimeMin: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe('Cook time in minutes'),
        tagIds: z
          .array(z.uuid())
          .optional()
          .describe('Tag ids to attach to the recipe'),
      },
    },
    async args =>
      textResult(
        await client.createRecipe({
          title: args.title,
          description: args.description ?? null,
          servings: args.servings,
          prepTimeMin: args.prepTimeMin ?? null,
          cookTimeMin: args.cookTimeMin ?? null,
          imageUrl: null,
          sourceUrl: null,
          ingredients: args.ingredients.map((ingredient, index) => ({
            sortOrder: index,
            name: ingredient.name,
            quantity: ingredient.quantity ?? null,
            unit: ingredient.unit ?? null,
            notes: ingredient.notes ?? null,
            isOptional: ingredient.isOptional ?? false,
          })),
          instructions: args.instructions.map((body, index) => ({
            stepNumber: index + 1,
            body,
          })),
          tagIds: args.tagIds ?? [],
        }),
      ),
  );

  server.registerTool(
    'update_recipe',
    {
      title: 'Update recipe',
      description:
        'Update an existing recipe in your Eciperay collection. Only the fields you provide change; omitted fields keep their stored values. Provide null for description, prepTimeMin, or cookTimeMin to clear them. Only your own recipes can be updated. To change ingredients or instructions, also pass versionId (from get_recipe) naming the version to edit: the edit is applied atomically — an editable draft version is edited in place, while naming the active version branches a new version from it, leaving the named version untouched in history. Any metadata fields in the same call are applied to that same version. The edited version becomes active only when you also pass activate: true; by default it stays a draft and get_recipe keeps showing the previously active version. The result of a content edit is the edited version, including its id and versionNumber. Pass that id as versionId to edit the same version again. Metadata-only updates need versionId only when they should land on a specific draft version instead of the active one.',
      inputSchema: {
        id: z.string().describe('Recipe id, from search_recipes'),
        versionId: z
          .string()
          .optional()
          .describe(
            'Version to edit, from get_recipe. Required when changing ingredients or instructions; the edit applies to this version',
          ),
        activate: z
          .boolean()
          .optional()
          .describe(
            'With a version edit: make the edited version the active one. Defaults to false — the edited version stays a draft',
          ),
        title: z.string().min(1).optional().describe('Recipe title'),
        servings: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Number of servings'),
        ingredients: z
          .array(ingredientSchema)
          .min(1)
          .optional()
          .describe('Ingredients in order (replaces the stored list)'),
        instructions: z
          .array(z.string().min(1))
          .min(1)
          .optional()
          .describe('Preparation steps in order (replaces the stored list)'),
        description: z
          .string()
          .nullable()
          .optional()
          .describe('Short description, or null to clear it'),
        prepTimeMin: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .optional()
          .describe('Prep time in minutes, or null to clear it'),
        cookTimeMin: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .optional()
          .describe('Cook time in minutes, or null to clear it'),
        tagIds: z
          .array(z.uuid())
          .optional()
          .describe('Tag ids to attach to the recipe (replaces stored tags)'),
      },
    },
    async ({id, versionId, activate, ingredients, instructions, ...fields}) =>
      textResult(
        await client.updateRecipe(id, {
          ...fields,
          ...(versionId !== undefined ? {versionId} : {}),
          ...(activate !== undefined ? {activate} : {}),
          ...(ingredients !== undefined
            ? {
                ingredients: ingredients.map((ingredient, index) => ({
                  sortOrder: index,
                  name: ingredient.name,
                  quantity: ingredient.quantity ?? null,
                  unit: ingredient.unit ?? null,
                  notes: ingredient.notes ?? null,
                  isOptional: ingredient.isOptional ?? false,
                })),
              }
            : {}),
          ...(instructions !== undefined
            ? {
                instructions: instructions.map((body, index) => ({
                  stepNumber: index + 1,
                  body,
                })),
              }
            : {}),
        }),
      ),
  );

  server.registerTool(
    'list_meal_plans',
    {
      title: 'List meal plans',
      description: 'List your saved meal plans.',
      inputSchema: {},
    },
    async () => textResult(await client.listMealPlans()),
  );

  server.registerTool(
    'get_meal_plan',
    {
      title: 'Get meal plan details',
      description: 'Fetch a meal plan with its scheduled meals and recipes.',
      inputSchema: {
        id: z.string().describe('Meal plan id, from list_meal_plans'),
      },
    },
    async ({id}) => textResult(await client.getMealPlan(id)),
  );

  server.registerTool(
    'get_shopping_list',
    {
      title: 'Get shopping list',
      description: 'Build the aggregated shopping list for a meal plan.',
      inputSchema: {
        mealPlanId: z.string().describe('Meal plan id, from list_meal_plans'),
      },
    },
    async ({mealPlanId}) =>
      textResult(await client.getShoppingList(mealPlanId)),
  );

  server.registerTool(
    'list_meals',
    {
      title: 'List meals',
      description:
        'List your saved meals (named bundles of recipes used in meal plans).',
      inputSchema: {},
    },
    async () => textResult(await client.listMeals()),
  );

  server.registerTool(
    'get_meal',
    {
      title: 'Get meal details',
      description:
        'Fetch a meal with its member recipes, direct ingredients, and servings.',
      inputSchema: {id: z.string().describe('Meal id, from list_meals')},
    },
    async ({id}) => textResult(await client.getMeal(id)),
  );

  server.registerTool(
    'create_meal',
    {
      title: 'Create meal',
      description:
        'Create a meal: a named bundle of recipes and/or direct ingredients (one-off items entered on the meal itself, e.g. a shake or a side) that can be scheduled in meal plans. A meal needs at least one recipe or direct ingredient. Direct-ingredient nutrition is estimated server-side at save time.',
      inputSchema: {
        title: z.string().min(1).max(200).describe('Meal title'),
        notes: z
          .string()
          .max(4000)
          .nullable()
          .optional()
          .describe('Notes for the meal'),
        recipes: mealRecipeListSchema
          .optional()
          .describe('Member recipes, in order'),
        ingredients: mealIngredientListSchema.optional(),
      },
    },
    async args => {
      const recipes = args.recipes ?? [];
      const ingredients = args.ingredients ?? [];
      if (recipes.length + ingredients.length < 1) {
        throw new Error(
          'create_meal requires at least one recipe or direct ingredient; both were empty or omitted, so nothing was created.',
        );
      }
      return textResult(
        await client.createMeal({
          title: args.title,
          notes: args.notes ?? null,
          recipes,
          ...(args.ingredients !== undefined ? {ingredients} : {}),
        }),
      );
    },
  );

  server.registerTool(
    'update_meal',
    {
      title: 'Update meal',
      description:
        'Update an existing meal. Only the fields you provide change; omitted fields keep their stored values. Provide null for notes to clear it. Providing recipes replaces the whole member list; providing ingredients replaces the whole direct-ingredient list and re-estimates their nutrition server-side (an empty list removes all direct ingredients). A meal must keep at least one recipe or direct ingredient across the update. Only your own meals can be updated.',
      inputSchema: {
        id: z.string().describe('Meal id, from list_meals'),
        title: z.string().min(1).max(200).optional().describe('Meal title'),
        notes: z
          .string()
          .max(4000)
          .nullable()
          .optional()
          .describe('Notes for the meal, or null to clear them'),
        recipes: mealRecipeListSchema
          .optional()
          .describe(
            'Member recipes, in order (replaces the stored list; may be empty when the meal keeps direct ingredients)',
          ),
        ingredients: mealIngredientListSchema
          .optional()
          .describe(
            'Direct ingredients, in order (replaces the stored list and re-estimates their nutrition)',
          ),
      },
    },
    async ({id, ...patch}) => textResult(await client.updateMeal(id, patch)),
  );

  server.registerTool(
    'delete_meal',
    {
      title: 'Delete meal',
      description:
        'Delete a meal. The API refuses (409) while a meal plan still references the meal — remove it from those plans first.',
      inputSchema: {id: z.string().describe('Meal id, from list_meals')},
    },
    async ({id}) => textResult(await client.deleteMeal(id)),
  );

  server.registerTool(
    'add_recipe_to_meal',
    {
      title: 'Add recipe to meal',
      description:
        'Add a recipe to a meal, appended last. If the recipe is already a member, its servings are updated instead (when provided).',
      inputSchema: {
        mealId: z.string().describe('Meal id, from list_meals'),
        recipeId: z.uuid().describe('Recipe id, from search_recipes'),
        servings: pgIntSchema
          .optional()
          .describe('Servings of the recipe in the meal'),
      },
    },
    async ({mealId, recipeId, servings}) =>
      textResult(
        await client.addRecipeToMeal(mealId, {
          recipeId,
          ...(servings !== undefined ? {servings} : {}),
        }),
      ),
  );

  server.registerTool(
    'remove_recipe_from_meal',
    {
      title: 'Remove recipe from meal',
      description:
        'Remove a recipe from a meal. A meal must keep at least one recipe or direct ingredient, so removing its last recipe is an error only when the meal has no direct ingredients.',
      inputSchema: {
        mealId: z.string().describe('Meal id, from list_meals'),
        recipeId: z.uuid().describe('Recipe id, from search_recipes'),
      },
    },
    async ({mealId, recipeId}) =>
      textResult(await client.removeRecipeFromMeal(mealId, recipeId)),
  );

  server.registerTool(
    'create_meal_plan',
    {
      title: 'Create meal plan',
      description:
        'Create a meal plan from entries: each entry is a meal (mealId) or a standalone recipe (recipeId), in schedule order. A plan needs at least one entry, and a meal or recipe can appear only once per plan.',
      inputSchema: {
        title: z.string().min(1).max(200).describe('Meal plan title'),
        notes: z
          .string()
          .max(4000)
          .nullable()
          .optional()
          .describe('Notes for the plan'),
        startsOn: planDateSchema
          .nullable()
          .optional()
          .describe('First day of the plan, or null'),
        endsOn: planDateSchema
          .nullable()
          .optional()
          .describe('Last day of the plan, or null'),
        entries: z
          .array(mealPlanEntrySchema)
          .min(1)
          .describe('Plan entries, in order'),
      },
    },
    async args =>
      textResult(
        await client.createMealPlan({
          title: args.title,
          notes: args.notes ?? null,
          startsOn: args.startsOn ?? null,
          endsOn: args.endsOn ?? null,
          entries: args.entries,
        }),
      ),
  );

  server.registerTool(
    'update_meal_plan',
    {
      title: 'Update meal plan',
      description:
        'Update an existing meal plan. Only the fields you provide change; omitted fields keep their stored values. Provide null for notes, startsOn, or endsOn to clear them. Providing entries replaces the whole entry list (in the given order) — for single-entry changes prefer add_meal_plan_entry, remove_meal_plan_entry, and reorder_meal_plan_entries. Only your own plans can be updated.',
      inputSchema: {
        id: z.string().describe('Meal plan id, from list_meal_plans'),
        title: z.string().min(1).max(200).optional().describe('Plan title'),
        notes: z
          .string()
          .max(4000)
          .nullable()
          .optional()
          .describe('Notes for the plan, or null to clear them'),
        startsOn: planDateSchema
          .nullable()
          .optional()
          .describe('First day of the plan, or null to clear it'),
        endsOn: planDateSchema
          .nullable()
          .optional()
          .describe('Last day of the plan, or null to clear it'),
        entries: z
          .array(mealPlanEntrySchema)
          .min(1)
          .optional()
          .describe('Plan entries, in order (replaces the stored list)'),
      },
    },
    async ({id, ...patch}) =>
      textResult(await client.updateMealPlan(id, patch)),
  );

  server.registerTool(
    'delete_meal_plan',
    {
      title: 'Delete meal plan',
      description: 'Delete a meal plan and its entries.',
      inputSchema: {
        id: z.string().describe('Meal plan id, from list_meal_plans'),
      },
    },
    async ({id}) => textResult(await client.deleteMealPlan(id)),
  );

  server.registerTool(
    'add_meal_plan_entry',
    {
      title: 'Add meal plan entry',
      description:
        'Add an entry to a meal plan, appended last: give exactly one of mealId (a meal) or recipeId (a standalone recipe). If that meal or recipe is already an entry, its quantity/servings are updated instead (the API allows each only once per plan).',
      inputSchema: {
        mealPlanId: z.string().describe('Meal plan id, from list_meal_plans'),
        mealId: z
          .uuid()
          .optional()
          .describe(
            'Meal id, from list_meals (mutually exclusive with recipeId)',
          ),
        recipeId: z
          .uuid()
          .optional()
          .describe(
            'Recipe id, from search_recipes (mutually exclusive with mealId)',
          ),
        servings: pgIntSchema
          .optional()
          .describe('Servings of the recipe (recipe entries only)'),
        quantity: pgIntSchema
          .optional()
          .describe('How many times the entry appears (default 1)'),
      },
    },
    async ({mealPlanId, mealId, recipeId, servings, quantity}) => {
      if ((mealId === undefined) === (recipeId === undefined)) {
        throw new Error(
          'add_meal_plan_entry requires exactly one of mealId or recipeId.',
        );
      }
      if (servings !== undefined && recipeId === undefined) {
        throw new Error(
          'add_meal_plan_entry: servings applies only to recipe entries; give a recipeId or omit servings.',
        );
      }
      if (mealId !== undefined) {
        return textResult(
          await client.addMealPlanEntry(mealPlanId, {
            mealId,
            ...(quantity !== undefined ? {quantity} : {}),
          }),
        );
      }
      return textResult(
        await client.addMealPlanEntry(mealPlanId, {
          recipeId: recipeId as string,
          ...(servings !== undefined ? {servings} : {}),
          ...(quantity !== undefined ? {quantity} : {}),
        }),
      );
    },
  );

  server.registerTool(
    'remove_meal_plan_entry',
    {
      title: 'Remove meal plan entry',
      description:
        'Remove one entry from a meal plan by its entry id (from get_meal_plan). A plan must keep at least one entry, so removing its last entry is an error.',
      inputSchema: {
        mealPlanId: z.string().describe('Meal plan id, from list_meal_plans'),
        entryId: z.string().describe('Entry id, from get_meal_plan'),
      },
    },
    async ({mealPlanId, entryId}) =>
      textResult(await client.removeMealPlanEntry(mealPlanId, entryId)),
  );

  server.registerTool(
    'reorder_meal_plan_entries',
    {
      title: 'Reorder meal plan entries',
      description:
        'Reorder a meal plan’s entries. entryIds must list every current entry id (from get_meal_plan) exactly once, in the new order.',
      inputSchema: {
        mealPlanId: z.string().describe('Meal plan id, from list_meal_plans'),
        entryIds: z
          .array(z.string())
          .min(1)
          .describe('Every entry id of the plan, in the new order'),
      },
    },
    async ({mealPlanId, entryIds}) =>
      textResult(await client.reorderMealPlanEntries(mealPlanId, entryIds)),
  );
};
