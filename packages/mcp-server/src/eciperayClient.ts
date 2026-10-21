/**
 * Thin HTTP client for the Eciperay REST API.
 *
 * Authentication uses the same Supabase bearer token as the web and mobile
 * clients. Configure with ECIPERAY_API_URL (defaults to http://localhost:8080)
 * and ECIPERAY_API_TOKEN.
 */

export type EciperayClientConfig = {apiUrl: string; apiToken: string};

export const loadConfig = (): EciperayClientConfig => {
  const apiToken = process.env['ECIPERAY_API_TOKEN'];
  if (!apiToken) {
    throw new Error(
      'ECIPERAY_API_TOKEN is required. Provide a Supabase access token for your Eciperay account.',
    );
  }
  const apiUrl = process.env['ECIPERAY_API_URL'] ?? 'http://localhost:8080';
  return {apiUrl: apiUrl.replace(/\/$/, ''), apiToken};
};

export class EciperayApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'EciperayApiError';
    this.status = status;
  }
}

export const createClient = (config: EciperayClientConfig) => {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    headers.set('authorization', `Bearer ${config.apiToken}`);
    const res = await fetch(`${config.apiUrl}/api${path}`, {...init, headers});
    if (!res.ok) {
      const body = await res.text();
      throw new EciperayApiError(
        res.status,
        `Eciperay API ${res.status}: ${body.slice(0, 500)}`,
      );
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  };

  return {
    listRecipes: (params: {
      search?: string;
      limit?: number;
      offset?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.search) {
        qs.set('search', params.search);
      }
      if (params.limit !== undefined) {
        qs.set('limit', String(params.limit));
      }
      if (params.offset !== undefined) {
        qs.set('offset', String(params.offset));
      }
      const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
      return request<unknown[]>(`/recipes${suffix}`);
    },
    getRecipe: (id: string) =>
      request<unknown>(`/recipes/${encodeURIComponent(id)}`),
    createRecipe: (input: unknown) =>
      request<unknown>('/recipes', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    /**
     * Partial update: the REST API only offers a full-replace PUT, so read the
     * current recipe, merge the patch over it, and PUT the result. Both
     * endpoints resolve recipes by owner, so a recipe that does not exist or
     * belongs to someone else fails with the API's 404 instead of silently
     * doing nothing.
     */
    updateRecipe: async (id: string, patch: RecipeUpdatePatch) => {
      if (!hasRecipeUpdateFields(patch)) {
        throw new Error(
          'update_recipe requires at least one field to update; every field was omitted.',
        );
      }
      const current = await request<RecipeDetailForUpdate>(
        `/recipes/${encodeURIComponent(id)}`,
      );
      return request<unknown>(`/recipes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(buildRecipeUpdatePayload(current, patch)),
      });
    },
    listMealPlans: () => request<unknown[]>('/meal-plans'),
    getMealPlan: (id: string) =>
      request<unknown>(`/meal-plans/${encodeURIComponent(id)}`),
    getShoppingList: (mealPlanId: string) =>
      request<unknown[]>(
        `/meal-plans/${encodeURIComponent(mealPlanId)}/shopping-list`,
      ),
  };
};

/** Ingredient/instruction shapes accepted by the REST recipe endpoints. */
export type RecipeIngredientInput = {
  sortOrder: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  isOptional: boolean;
};

export type RecipeInstructionInput = {stepNumber: number; body: string};

/**
 * The subset of recipe fields `update_recipe` may change. A field left
 * `undefined` is preserved from the stored recipe; a field set to `null` (where
 * nullable) clears it.
 */
export type RecipeUpdatePatch = {
  title?: string;
  description?: string | null;
  servings?: number;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  ingredients?: RecipeIngredientInput[];
  instructions?: RecipeInstructionInput[];
  tagIds?: string[];
};

/** The recipe-detail shape returned by `GET /recipes/:id`, as read here. */
type RecipeDetailForUpdate = {
  title: string;
  description: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  status?: string;
  ingredients: (RecipeIngredientInput & Record<string, unknown>)[];
  instructions: (RecipeInstructionInput & Record<string, unknown>)[];
  tags: {id: string}[];
};

const PATCH_FIELDS: (keyof RecipeUpdatePatch)[] = [
  'title',
  'description',
  'servings',
  'prepTimeMin',
  'cookTimeMin',
  'ingredients',
  'instructions',
  'tagIds',
];

/** True when the patch provides at least one field to change. */
export const hasRecipeUpdateFields = (patch: RecipeUpdatePatch): boolean =>
  PATCH_FIELDS.some(field => patch[field] !== undefined);

/**
 * Merge a partial update over the stored recipe detail, producing the full
 * payload the REST `PUT /recipes/:id` endpoint expects. Fields the patch does
 * not provide are carried over from the stored recipe (including imageUrl,
 * sourceUrl, and status, which `update_recipe` cannot change), so a partial
 * update never clears data it did not mention.
 */
export const buildRecipeUpdatePayload = (
  current: RecipeDetailForUpdate,
  patch: RecipeUpdatePatch,
): Record<string, unknown> => {
  if (!hasRecipeUpdateFields(patch)) {
    throw new Error(
      'update_recipe requires at least one field to update; every field was omitted.',
    );
  }
  return {
    title: patch.title ?? current.title,
    description:
      patch.description !== undefined ? patch.description : current.description,
    servings: patch.servings ?? current.servings,
    prepTimeMin:
      patch.prepTimeMin !== undefined ? patch.prepTimeMin : current.prepTimeMin,
    cookTimeMin:
      patch.cookTimeMin !== undefined ? patch.cookTimeMin : current.cookTimeMin,
    imageUrl: current.imageUrl,
    sourceUrl: current.sourceUrl,
    ...(current.status !== undefined ? {status: current.status} : {}),
    ingredients: (patch.ingredients ?? current.ingredients).map(
      (ingredient, index) => ({
        sortOrder: ingredient.sortOrder ?? index,
        name: ingredient.name,
        quantity: ingredient.quantity ?? null,
        unit: ingredient.unit ?? null,
        notes: ingredient.notes ?? null,
        isOptional: ingredient.isOptional ?? false,
      }),
    ),
    instructions: (patch.instructions ?? current.instructions).map(
      (instruction, index) => ({
        stepNumber: instruction.stepNumber ?? index + 1,
        body: instruction.body,
      }),
    ),
    tagIds: patch.tagIds ?? current.tags.map(tag => tag.id),
  };
};

export type EciperayClient = ReturnType<typeof createClient>;
