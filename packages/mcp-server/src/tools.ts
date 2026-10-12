import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import type {EciperayClient} from './eciperayClient.js';

const textResult = (data: unknown) => ({
  content: [{type: 'text' as const, text: JSON.stringify(data, null, 2)}],
});

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
          .array(z.string().uuid())
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
};
