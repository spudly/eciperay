/**
 * Thin HTTP client for the Eciperay REST API.
 *
 * Authentication uses the same Supabase bearer token as the web and mobile
 * clients. Configure with ECIPERAY_API_URL (defaults to http://localhost:8080)
 * and ECIPERAY_API_TOKEN.
 */

import {createHash} from 'node:crypto';

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

/**
 * Process-wide registry of in-flight read-merge-PUT sequences, keyed by account
 * scope + resource. Shared across every client created in this process so the
 * HTTP transport's per-request clients still serialize against each other.
 */
const sharedResourceLocks = new Map<string, Promise<void>>();

const withSharedResourceLock = async <T>(
  key: string,
  run: () => Promise<T>,
): Promise<T> => {
  const previous = sharedResourceLocks.get(key) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>(resolve => {
    release = resolve;
  });
  const chained = previous.then(() => current);
  sharedResourceLocks.set(key, chained);
  await previous;
  try {
    return await run();
  } finally {
    release();
    if (sharedResourceLocks.get(key) === chained) {
      sharedResourceLocks.delete(key);
    }
  }
};

/**
 * Ids are UUIDs: PostgreSQL returns them lowercase, but a caller may supply the
 * same id with uppercase hex (z.uuid() accepts both). All id comparisons and
 * lock keys go through this normalization so case never changes meaning.
 */
const normalizeId = (id: string): string => id.toLowerCase();

const sameId = (a: string, b: string): boolean =>
  normalizeId(a) === normalizeId(b);

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

  /**
   * Serialize a read-merge-PUT sequence per resource. The meal and meal-plan
   * endpoints only offer full-replace PUTs, so two mutations of the same record
   * that both read before either writes would silently lose one change — and an
   * MCP caller can trigger exactly that by issuing tool calls in parallel.
   * Chaining each mutation of a resource behind the previous one makes every
   * read observe the previous write. Mutations of different resources still run
   * concurrently.
   *
   * The lock registry is process-wide (see `sharedResourceLocks` above), not
   * per client: the HTTP transport creates a fresh server and client for every
   * POST, so a per-client map would never serialize two remote calls. The lock
   * key is scoped by API URL and a hash of the caller's token, so different
   * accounts never block each other. Serialization across processes (and
   * against other clients such as the web app) still needs API-side conditional
   * writes — tracked in #384.
   */
  const lockScope = `${config.apiUrl}#${createHash('sha256')
    .update(config.apiToken)
    .digest('hex')}`;
  const withResourceLock = async <T>(
    key: string,
    run: () => Promise<T>,
  ): Promise<T> => withSharedResourceLock(`${lockScope}:${key}`, run);
  const withFirstArgLock =
    <A extends unknown[], R>(
      keyPrefix: string,
      fn: (id: string, ...args: A) => Promise<R>,
    ) =>
    (id: string, ...args: A): Promise<R> =>
      withResourceLock(`${keyPrefix}:${normalizeId(id)}`, () =>
        fn(id, ...args),
      );

  const api = {
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
     *
     * Three safeguards on top of the raw read-merge-write:
     *
     * - Content edits are refused with a clear error (see
     *   assertContentUnchanged): the API locks ingredients/instructions on the
     *   active version, so a changed list would only fail with a raw 409 from
     *   the PUT.
     * - The recipe is re-read just before the PUT and the merge is built from
     *   that freshest read, so a concurrent edit is not silently overwritten
     *   with stale preserved fields. The comparison covers every preserved
     *   field, not just contentRevision: the API's metadata-save path does not
     *   bump contentRevision, so a revision check alone would miss metadata
     *   edits. If the recipe keeps changing across re-reads, a conflict error
     *   is raised instead.
     * - The result is a fresh GET, so callers receive the same representation as
     *   get_recipe (the PUT response omits the ratings enrichment GET adds).
     */
    updateRecipe: async (id: string, patch: RecipeUpdatePatch) => {
      if (!hasRecipeUpdateFields(patch)) {
        throw new Error(
          'update_recipe requires at least one field to update; every field was omitted.',
        );
      }
      const path = `/recipes/${encodeURIComponent(id)}`;
      let current = await request<RecipeDetailForUpdate>(path);
      assertContentUnchanged(current, patch);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const fresh = await request<RecipeDetailForUpdate>(path);
        if (recipeSnapshot(fresh) === recipeSnapshot(current)) {
          await request<unknown>(path, {
            method: 'PUT',
            body: JSON.stringify(buildRecipeUpdatePayload(fresh, patch)),
          });
          return request<unknown>(path);
        }
        current = fresh;
        assertContentUnchanged(current, patch);
      }
      throw new Error(
        'update_recipe aborted: the recipe kept changing while the update was being applied, so no changes were written. Retry the update.',
      );
    },
    listMealPlans: () => request<unknown[]>('/meal-plans'),
    getMealPlan: (id: string) =>
      request<unknown>(`/meal-plans/${encodeURIComponent(id)}`),
    getShoppingList: (mealPlanId: string) =>
      request<unknown[]>(
        `/meal-plans/${encodeURIComponent(mealPlanId)}/shopping-list`,
      ),
    listMeals: () => request<unknown[]>('/meals'),
    getMeal: (id: string) =>
      request<unknown>(`/meals/${encodeURIComponent(id)}`),
    createMeal: (input: MealInput) =>
      request<unknown>('/meals', {method: 'POST', body: JSON.stringify(input)}),
    /**
     * Partial update: the REST API only offers a full-replace PUT for meals, so
     * read the current meal, merge the patch over it, and PUT the result. Both
     * endpoints resolve meals by owner, so a meal that does not exist or
     * belongs to someone else fails with the API's 404.
     */
    updateMeal: async (id: string, patch: MealUpdatePatch) => {
      if (!hasMealUpdateFields(patch)) {
        throw new Error(
          'update_meal requires at least one field to update; every field was omitted.',
        );
      }
      const path = `/meals/${encodeURIComponent(id)}`;
      const current = await request<MealDetailForUpdate>(path);
      return request<unknown>(path, {
        method: 'PUT',
        body: JSON.stringify(buildMealUpdatePayload(current, patch)),
      });
    },
    deleteMeal: async (id: string) => {
      await request<undefined>(`/meals/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return {deleted: true, id};
    },
    /**
     * Add a recipe to a meal, or update its servings when the recipe is already
     * a member. Implemented as read-merge-PUT over the REST API's full-replace
     * meal endpoint; the new member goes last.
     */
    addRecipeToMeal: async (mealId: string, recipe: MealRecipeInput) => {
      const path = `/meals/${encodeURIComponent(mealId)}`;
      const current = await request<MealDetailForUpdate>(path);
      const recipes = mealRecipeInputs(current);
      const existing = recipes.find(member =>
        sameId(member.recipeId, recipe.recipeId),
      );
      if (existing) {
        if (recipe.servings !== undefined) {
          existing.servings = recipe.servings;
        }
      } else {
        recipes.push({...recipe});
      }
      return request<unknown>(path, {
        method: 'PUT',
        body: JSON.stringify({
          title: current.title,
          notes: current.notes,
          recipes,
        }),
      });
    },
    removeRecipeFromMeal: async (mealId: string, recipeId: string) => {
      const path = `/meals/${encodeURIComponent(mealId)}`;
      const current = await request<MealDetailForUpdate>(path);
      const recipes = mealRecipeInputs(current);
      if (!recipes.some(member => sameId(member.recipeId, recipeId))) {
        throw new Error(
          `remove_recipe_from_meal: recipe ${recipeId} is not a member of meal ${mealId}; nothing was changed.`,
        );
      }
      if (recipes.length === 1) {
        throw new Error(
          'remove_recipe_from_meal: a meal must keep at least one recipe; add another recipe first or delete the meal instead.',
        );
      }
      return request<unknown>(path, {
        method: 'PUT',
        body: JSON.stringify({
          title: current.title,
          notes: current.notes,
          recipes: recipes.filter(member => !sameId(member.recipeId, recipeId)),
        }),
      });
    },
    createMealPlan: (input: MealPlanInput) =>
      request<unknown>('/meal-plans', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    /**
     * Partial update: the REST API only offers a full-replace PUT for meal
     * plans, so read the current plan, merge the patch over it, and PUT the
     * result. A missing or foreign plan fails with the API's 404.
     */
    updateMealPlan: async (id: string, patch: MealPlanUpdatePatch) => {
      if (!hasMealPlanUpdateFields(patch)) {
        throw new Error(
          'update_meal_plan requires at least one field to update; every field was omitted.',
        );
      }
      const path = `/meal-plans/${encodeURIComponent(id)}`;
      const current = await request<MealPlanDetailForUpdate>(path);
      return request<unknown>(path, {
        method: 'PUT',
        body: JSON.stringify(buildMealPlanUpdatePayload(current, patch)),
      });
    },
    deleteMealPlan: async (id: string) => {
      await request<undefined>(`/meal-plans/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return {deleted: true, id};
    },
    /**
     * Add an entry (a meal or a standalone recipe) to a plan, or update its
     * quantity/servings when that meal or recipe is already an entry — the REST
     * API rejects duplicate meals and duplicate recipes in one plan. The new
     * entry goes last; use reorderMealPlanEntries to move it.
     */
    addMealPlanEntry: async (mealPlanId: string, entry: MealPlanEntryInput) => {
      const path = `/meal-plans/${encodeURIComponent(mealPlanId)}`;
      const current = await request<MealPlanDetailForUpdate>(path);
      const entries = mealPlanEntryInputs(current);
      const existing = entries.find(candidate =>
        mealPlanEntriesMatch(candidate, entry),
      );
      if (existing) {
        if (entry.quantity !== undefined) {
          existing.quantity = entry.quantity;
        }
        if ('recipeId' in entry && 'recipeId' in existing) {
          if (entry.servings !== undefined) {
            existing.servings = entry.servings;
          }
        }
      } else {
        entries.push({...entry});
      }
      return request<unknown>(path, {
        method: 'PUT',
        body: JSON.stringify(mealPlanPayload(current, entries)),
      });
    },
    removeMealPlanEntry: async (mealPlanId: string, entryId: string) => {
      const path = `/meal-plans/${encodeURIComponent(mealPlanId)}`;
      const current = await request<MealPlanDetailForUpdate>(path);
      if (!current.entries.some(entry => sameId(entry.id, entryId))) {
        throw new Error(
          `remove_meal_plan_entry: entry ${entryId} is not part of meal plan ${mealPlanId}; nothing was changed.`,
        );
      }
      if (current.entries.length === 1) {
        throw new Error(
          'remove_meal_plan_entry: a meal plan must keep at least one entry; add another entry first or delete the plan instead.',
        );
      }
      const entries = [...current.entries]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .filter(entry => !sameId(entry.id, entryId))
        .map(mealPlanEntryInput);
      return request<unknown>(path, {
        method: 'PUT',
        body: JSON.stringify(mealPlanPayload(current, entries)),
      });
    },
    /**
     * Reorder a plan's entries. `entryIds` must name every current entry
     * exactly once (the ids from get_meal_plan); anything else is an error and
     * nothing is written.
     */
    reorderMealPlanEntries: async (mealPlanId: string, entryIds: string[]) => {
      const path = `/meal-plans/${encodeURIComponent(mealPlanId)}`;
      const current = await request<MealPlanDetailForUpdate>(path);
      const currentIds = current.entries.map(entry => normalizeId(entry.id));
      const requestedIds = entryIds.map(normalizeId);
      const isPermutation =
        requestedIds.length === currentIds.length &&
        new Set(requestedIds).size === requestedIds.length &&
        currentIds.every(id => requestedIds.includes(id));
      if (!isPermutation) {
        throw new Error(
          'reorder_meal_plan_entries: entryIds must list every entry of the plan exactly once (use the entry ids from get_meal_plan); nothing was changed.',
        );
      }
      const byId = new Map(
        current.entries.map(entry => [
          normalizeId(entry.id),
          mealPlanEntryInput(entry),
        ]),
      );
      const entries = requestedIds
        .map(id => byId.get(id))
        .filter(entry => entry !== undefined);
      return request<unknown>(path, {
        method: 'PUT',
        body: JSON.stringify(mealPlanPayload(current, entries)),
      });
    },
  };

  return {
    ...api,
    updateMeal: withFirstArgLock('meal', api.updateMeal),
    addRecipeToMeal: withFirstArgLock('meal', api.addRecipeToMeal),
    removeRecipeFromMeal: withFirstArgLock('meal', api.removeRecipeFromMeal),
    updateMealPlan: withFirstArgLock('meal-plan', api.updateMealPlan),
    addMealPlanEntry: withFirstArgLock('meal-plan', api.addMealPlanEntry),
    removeMealPlanEntry: withFirstArgLock('meal-plan', api.removeMealPlanEntry),
    reorderMealPlanEntries: withFirstArgLock(
      'meal-plan',
      api.reorderMealPlanEntries,
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
  contentRevision: number;
  versionId: string;
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

const serializeIngredients = (
  ingredients: readonly (Partial<RecipeIngredientInput> &
    Record<string, unknown>)[],
): string =>
  [...ingredients]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(ingredient =>
      [
        ingredient.name,
        ingredient.quantity ?? null,
        ingredient.unit ?? null,
        ingredient.notes ?? null,
        ingredient.isOptional ?? false,
      ].join('|'),
    )
    .join(';');

const serializeInstructions = (
  instructions: readonly (Partial<RecipeInstructionInput> &
    Record<string, unknown>)[],
): string =>
  [...instructions]
    .sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0))
    .map(instruction => `${instruction.stepNumber}:${instruction.body}`)
    .join(';');

/**
 * Refuse ingredient/instruction changes with a clear error. The REST API locks
 * content on a recipe's active version (only draft versions are
 * content-editable, via the version workflow), so the full-replace PUT would
 * reject a changed list with a raw 409. Lists identical to the stored ones are
 * fine: they keep the PUT on its metadata-only path. Mirrors the comparison in
 * the server's recipeContentEquals.
 */
export const assertContentUnchanged = (
  current: RecipeDetailForUpdate,
  patch: RecipeUpdatePatch,
): void => {
  const ingredientsChanged =
    patch.ingredients !== undefined &&
    serializeIngredients(patch.ingredients) !==
      serializeIngredients(current.ingredients);
  const instructionsChanged =
    patch.instructions !== undefined &&
    serializeInstructions(patch.instructions) !==
      serializeInstructions(current.instructions);
  if (ingredientsChanged || instructionsChanged) {
    throw new Error(
      'update_recipe cannot change ingredients or instructions: content is locked on the active version of a recipe. Create a new version in the app to edit content, or update metadata fields only (title, description, servings, prepTimeMin, cookTimeMin, tagIds).',
    );
  }
};

/**
 * The fields a merged PUT would carry over from a stored recipe, serialized for
 * change detection between two reads. Includes contentRevision and versionId,
 * but does not rely on them alone: the API's metadata-save path
 * (saveRecipeMetadata) never bumps contentRevision.
 */
const recipeSnapshot = (recipe: RecipeDetailForUpdate): string =>
  JSON.stringify({
    contentRevision: recipe.contentRevision,
    versionId: recipe.versionId,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    status: recipe.status ?? null,
    ingredients: serializeIngredients(recipe.ingredients),
    instructions: serializeInstructions(recipe.instructions),
    tagIds: recipe.tags.map(tag => tag.id),
  });

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

/** Recipe membership shapes accepted by the REST meal endpoints. */
export type MealRecipeInput = {recipeId: string; servings?: number};

/** Direct-ingredient shapes accepted by the REST meal endpoints (#362). */
export type MealIngredientInput = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  servings?: number;
};

export type MealInput = {
  title: string;
  notes?: string | null;
  recipes: MealRecipeInput[];
  ingredients?: MealIngredientInput[];
};

/**
 * The subset of meal fields `update_meal` may change. A field left `undefined`
 * is preserved from the stored meal; `notes` set to `null` clears it. Providing
 * `recipes` replaces the whole member list.
 */
export type MealUpdatePatch = {
  title?: string;
  notes?: string | null;
  recipes?: MealRecipeInput[];
};

/** Entry shapes accepted by the REST meal-plan endpoints. */
export type MealPlanEntryInput =
  | {mealId: string; quantity?: number}
  | {recipeId: string; servings?: number; quantity?: number};

export type MealPlanInput = {
  title: string;
  notes?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  entries: MealPlanEntryInput[];
};

/**
 * The subset of meal-plan fields `update_meal_plan` may change. A field left
 * `undefined` is preserved from the stored plan; `notes`, `startsOn`, and
 * `endsOn` set to `null` clear them. Providing `entries` replaces the whole
 * entry list (in the given order).
 */
export type MealPlanUpdatePatch = {
  title?: string;
  notes?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  entries?: MealPlanEntryInput[];
};

/** The meal-detail shape returned by `GET /meals/:id`, as read here. */
type MealDetailForUpdate = {
  title: string;
  notes: string | null;
  members: {recipeId: string; sortOrder: number; servings: number}[];
  // Direct ingredients (#362); absent on detail responses from before
  // the field existed. Read here only as part of the detail shape:
  // meal-write payloads always omit the field so the server preserves
  // the stored rows instead of re-estimating them (#432).
  ingredients?: {
    name: string;
    quantity: number | null;
    unit: string | null;
    sortOrder: number;
    servings: number;
  }[];
};

/** The meal-plan entry shape returned by `GET /meal-plans/:id`. */
type MealPlanEntryForUpdate =
  | {
      type: 'meal';
      id: string;
      mealId: string;
      sortOrder: number;
      quantity: number;
    }
  | {
      type: 'recipe';
      id: string;
      recipeId: string;
      sortOrder: number;
      quantity: number;
      servings: number;
    };

/** The meal-plan-detail shape returned by `GET /meal-plans/:id`. */
type MealPlanDetailForUpdate = {
  title: string;
  notes: string | null;
  startsOn: string | null;
  endsOn: string | null;
  entries: MealPlanEntryForUpdate[];
};

const MEAL_PATCH_FIELDS: (keyof MealUpdatePatch)[] = [
  'title',
  'notes',
  'recipes',
];

const MEAL_PLAN_PATCH_FIELDS: (keyof MealPlanUpdatePatch)[] = [
  'title',
  'notes',
  'startsOn',
  'endsOn',
  'entries',
];

/** True when the patch provides at least one field to change. */
const hasMealUpdateFields = (patch: MealUpdatePatch): boolean =>
  MEAL_PATCH_FIELDS.some(field => patch[field] !== undefined);

/** True when the patch provides at least one field to change. */
const hasMealPlanUpdateFields = (patch: MealPlanUpdatePatch): boolean =>
  MEAL_PLAN_PATCH_FIELDS.some(field => patch[field] !== undefined);

/** A stored meal's members as full-replace PUT inputs, in stored order. */
const mealRecipeInputs = (meal: MealDetailForUpdate): MealRecipeInput[] =>
  [...meal.members]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(member => ({recipeId: member.recipeId, servings: member.servings}));

/**
 * Merge a partial meal update over the stored meal detail, producing the full
 * payload the REST `PUT /meals/:id` endpoint expects.
 */
export const buildMealUpdatePayload = (
  current: MealDetailForUpdate,
  patch: MealUpdatePatch,
): MealInput => {
  if (!hasMealUpdateFields(patch)) {
    throw new Error(
      'update_meal requires at least one field to update; every field was omitted.',
    );
  }
  return {
    title: patch.title ?? current.title,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
    recipes: patch.recipes ?? mealRecipeInputs(current),
    // No `ingredients` key on purpose (#432): the server preserves the
    // stored direct-ingredient rows when the field is omitted, while a
    // sent list would be full-replaced — re-estimating (and possibly
    // nulling) nutrition for ingredients this update never touched.
  };
};

/** One stored plan entry as a full-replace PUT input. */
const mealPlanEntryInput = (
  entry: MealPlanEntryForUpdate,
): MealPlanEntryInput =>
  entry.type === 'meal'
    ? {mealId: entry.mealId, quantity: entry.quantity}
    : {
        recipeId: entry.recipeId,
        servings: entry.servings,
        quantity: entry.quantity,
      };

/** A stored plan's entries as full-replace PUT inputs, in stored order. */
export const mealPlanEntryInputs = (
  plan: MealPlanDetailForUpdate,
): MealPlanEntryInput[] =>
  [...plan.entries]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(mealPlanEntryInput);

/**
 * Merge a partial meal-plan update over the stored plan detail, producing the
 * full payload the REST `PUT /meal-plans/:id` endpoint expects.
 */
export const buildMealPlanUpdatePayload = (
  current: MealPlanDetailForUpdate,
  patch: MealPlanUpdatePatch,
): MealPlanInput => {
  if (!hasMealPlanUpdateFields(patch)) {
    throw new Error(
      'update_meal_plan requires at least one field to update; every field was omitted.',
    );
  }
  return {
    title: patch.title ?? current.title,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
    startsOn: patch.startsOn !== undefined ? patch.startsOn : current.startsOn,
    endsOn: patch.endsOn !== undefined ? patch.endsOn : current.endsOn,
    entries: patch.entries ?? mealPlanEntryInputs(current),
  };
};

/** Full-replace plan payload carrying the stored fields plus new entries. */
const mealPlanPayload = (
  current: MealPlanDetailForUpdate,
  entries: MealPlanEntryInput[],
): MealPlanInput => ({
  title: current.title,
  notes: current.notes,
  startsOn: current.startsOn,
  endsOn: current.endsOn,
  entries,
});

/** True when two entry inputs name the same meal or the same recipe. */
const mealPlanEntriesMatch = (
  a: MealPlanEntryInput,
  b: MealPlanEntryInput,
): boolean =>
  ('mealId' in a && 'mealId' in b && sameId(a.mealId, b.mealId)) ||
  ('recipeId' in a && 'recipeId' in b && sameId(a.recipeId, b.recipeId));

export type EciperayClient = ReturnType<typeof createClient>;
