import assert from 'node:assert/strict';
import {afterEach, describe, test} from 'node:test';

import {
  buildMealPlanUpdatePayload,
  buildMealUpdatePayload,
  buildRecipeUpdatePayload,
  createClient,
  EciperayApiError,
  mealPlanEntryInputs,
} from './eciperayClient.js';

const storedRecipe = {
  id: 'recipe-1',
  contentRevision: 1,
  versionId: 'version-1',
  title: 'Salt Water Taffy',
  description: 'Old-fashioned taffy',
  servings: 1,
  prepTimeMin: 10,
  cookTimeMin: 30,
  imageUrl: 'https://example.com/taffy.jpg',
  sourceUrl: 'https://example.com/source',
  status: 'evolving',
  ingredients: [
    {
      id: 'ing-1',
      recipeVersionId: 'version-1',
      sortOrder: 0,
      name: 'sugar',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
    {
      id: 'ing-2',
      recipeVersionId: 'version-1',
      sortOrder: 1,
      name: 'corn syrup',
      quantity: 1,
      unit: 'cup',
      notes: 'light',
      isOptional: false,
    },
  ],
  instructions: [
    {
      id: 'step-1',
      recipeVersionId: 'version-1',
      stepNumber: 1,
      body: 'Boil to 260F',
      estimatedDurationMin: 15,
    },
    {
      id: 'step-2',
      recipeVersionId: 'version-1',
      stepNumber: 2,
      body: 'Pull until opaque',
      estimatedDurationMin: null,
    },
  ],
  tags: [
    {id: 'tag-1', name: 'candy', color: '#ff0000'},
    {id: 'tag-2', name: 'dessert', color: '#00ff00'},
  ],
};

type FetchCall = {url: string; init?: RequestInit};

const stubFetch = (
  handler: (call: FetchCall) => {status: number; body: unknown},
) => {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const call: FetchCall = {url: String(url), init};
    calls.push(call);
    const {status, body} = handler(call);
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () =>
        typeof body === 'string' ? body : JSON.stringify(body),
      json: async () => body,
    } as Response;
  }) as typeof fetch;
  return calls;
};

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const client = () =>
  createClient({apiUrl: 'http://api.test', apiToken: '<redacted>'});

describe('buildRecipeUpdatePayload', () => {
  test('changing only servings preserves every other stored field', () => {
    const payload = buildRecipeUpdatePayload(storedRecipe, {servings: 40});
    assert.equal(payload['servings'], 40);
    assert.equal(payload['title'], 'Salt Water Taffy');
    assert.equal(payload['description'], 'Old-fashioned taffy');
    assert.equal(payload['prepTimeMin'], 10);
    assert.equal(payload['cookTimeMin'], 30);
    assert.equal(payload['imageUrl'], 'https://example.com/taffy.jpg');
    assert.equal(payload['sourceUrl'], 'https://example.com/source');
    assert.equal(payload['status'], 'evolving');
    // Stored ingredient ids/version ids are stripped to the input shape.
    assert.deepEqual(payload['ingredients'], [
      {
        sortOrder: 0,
        name: 'sugar',
        quantity: 2,
        unit: 'cups',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 1,
        name: 'corn syrup',
        quantity: 1,
        unit: 'cup',
        notes: 'light',
        isOptional: false,
      },
    ]);
    assert.deepEqual(payload['instructions'], [
      {stepNumber: 1, body: 'Boil to 260F'},
      {stepNumber: 2, body: 'Pull until opaque'},
    ]);
    assert.deepEqual(payload['tagIds'], ['tag-1', 'tag-2']);
  });

  test('explicit null clears nullable fields instead of preserving them', () => {
    const payload = buildRecipeUpdatePayload(storedRecipe, {
      description: null,
      prepTimeMin: null,
    });
    assert.equal(payload['description'], null);
    assert.equal(payload['prepTimeMin'], null);
    assert.equal(payload['cookTimeMin'], 30);
  });

  test('provided ingredients, instructions, and tagIds replace the stored ones', () => {
    const payload = buildRecipeUpdatePayload(storedRecipe, {
      ingredients: [
        {
          sortOrder: 0,
          name: 'butter',
          quantity: 1,
          unit: 'tbsp',
          notes: null,
          isOptional: true,
        },
      ],
      instructions: [{stepNumber: 1, body: 'Melt'}],
      tagIds: ['tag-9'],
    });
    assert.deepEqual(payload['ingredients'], [
      {
        sortOrder: 0,
        name: 'butter',
        quantity: 1,
        unit: 'tbsp',
        notes: null,
        isOptional: true,
      },
    ]);
    assert.deepEqual(payload['instructions'], [{stepNumber: 1, body: 'Melt'}]);
    assert.deepEqual(payload['tagIds'], ['tag-9']);
  });

  test('an empty patch is an error, not a silent no-op', () => {
    assert.throws(
      () => buildRecipeUpdatePayload(storedRecipe, {}),
      /at least one field/,
    );
  });
});

describe('client.updateRecipe', () => {
  test('GETs the stored recipe, PUTs the merged payload, returns a fresh GET', async () => {
    const updated = {...storedRecipe, servings: 40, contentRevision: 2};
    let putSeen = false;
    const calls = stubFetch(call => {
      if (call.init?.method === 'PUT') {
        putSeen = true;
        return {status: 200, body: {partial: 'put response is not returned'}};
      }
      return {status: 200, body: putSeen ? updated : storedRecipe};
    });
    const result = await client().updateRecipe('recipe-1', {servings: 40});
    // The PUT response lacks the ratings enrichment GET adds, so the tool
    // returns the post-update GET instead of the PUT body.
    assert.deepEqual(result, updated);
    const put = calls.find(call => call.init?.method === 'PUT');
    assert.ok(put);
    assert.equal(put.url, 'http://api.test/api/recipes/recipe-1');
    const sent = JSON.parse(String(put.init?.body)) as {
      servings: number;
      title: string;
    };
    assert.equal(sent.servings, 40);
    assert.equal(sent.title, 'Salt Water Taffy');
  });

  test('changing ingredients without versionId is refused with a clear error and no write', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedRecipe}));
    await assert.rejects(
      client().updateRecipe('recipe-1', {
        ingredients: [
          {
            sortOrder: 0,
            name: 'brown sugar',
            quantity: 2,
            unit: 'cups',
            notes: null,
            isOptional: false,
          },
        ],
      }),
      /requires versionId/,
    );
    assert.equal(calls.filter(call => call.init?.method === 'PUT').length, 0);
    assert.equal(calls.filter(call => call.init?.method === 'POST').length, 0);
  });

  test('changing ingredients on the active version posts one atomic version edit', async () => {
    const editedVersion = {
      id: 'version-2',
      recipeId: 'recipe-1',
      versionNumber: 2,
      derivedRole: 'draft',
      title: 'Salt Water Taffy',
    };
    const calls = stubFetch(call => {
      if (call.init?.method === 'POST') {
        return {status: 201, body: editedVersion};
      }
      return {status: 200, body: storedRecipe};
    });
    const result = await client().updateRecipe('recipe-1', {
      versionId: 'version-1',
      ingredients: [
        {
          sortOrder: 0,
          name: 'brown sugar',
          quantity: 2,
          unit: 'cups',
          notes: null,
          isOptional: false,
        },
      ],
    });
    assert.deepEqual(result, editedVersion);
    const posts = calls.filter(call => call.init?.method === 'POST');
    assert.equal(posts.length, 1);
    assert.equal(
      posts[0]?.url,
      'http://api.test/api/recipes/recipe-1/versions/version-1/edit',
    );
    const sent = JSON.parse(String(posts[0]?.init?.body)) as {
      title: string;
      activate: boolean;
      expectedContentRevision: number;
      ingredients: {name: string}[];
      instructions: {body: string}[];
    };
    // Metadata in the same call is carried over from the named version, and
    // activation defaults to off.
    assert.equal(sent.title, 'Salt Water Taffy');
    assert.equal(sent.activate, false);
    assert.equal(sent.expectedContentRevision, storedRecipe.contentRevision);
    assert.deepEqual(
      sent.ingredients.map(ingredient => ingredient.name),
      ['brown sugar'],
    );
    assert.deepEqual(
      sent.instructions.map(instruction => instruction.body),
      ['Boil to 260F', 'Pull until opaque'],
    );
    assert.equal(calls.filter(call => call.init?.method === 'PUT').length, 0);
  });

  test('activate: true is forwarded to the version edit', async () => {
    let postBody: Record<string, unknown> | undefined;
    stubFetch(call => {
      if (call.init?.method === 'POST') {
        postBody = JSON.parse(String(call.init.body)) as Record<
          string,
          unknown
        >;
        return {status: 201, body: {id: 'version-2', derivedRole: 'active'}};
      }
      return {status: 200, body: storedRecipe};
    });
    await client().updateRecipe('recipe-1', {
      versionId: 'version-1',
      activate: true,
      instructions: [{stepNumber: 1, body: 'Boil harder'}],
    });
    assert.equal(postBody?.['activate'], true);
  });

  test('naming a draft version merges the patch over that version, not the active one', async () => {
    const storedDraft = {
      id: 'version-2',
      recipeId: 'recipe-1',
      versionNumber: 2,
      title: 'Draft Taffy',
      description: 'Draft description',
      servings: 2,
      prepTimeMin: 5,
      cookTimeMin: 15,
      imageUrl: null,
      sourceUrl: null,
      ingredients: [
        {
          id: 'ing-9',
          recipeVersionId: 'version-2',
          sortOrder: 0,
          name: 'sugar',
          quantity: 1,
          unit: 'cup',
          notes: null,
          isOptional: false,
        },
      ],
      instructions: [{stepNumber: 1, body: 'Boil'}],
      tags: [{id: 'tag-1', name: 'candy', color: '#ff0000'}],
    };
    const editedDraft = {...storedDraft, servings: 8};
    let postBody: Record<string, unknown> | undefined;
    const calls = stubFetch(call => {
      if (call.init?.method === 'POST') {
        postBody = JSON.parse(String(call.init.body)) as Record<
          string,
          unknown
        >;
        return {status: 200, body: editedDraft};
      }
      if (call.url.endsWith('/versions/version-2')) {
        return {status: 200, body: storedDraft};
      }
      return {status: 200, body: storedRecipe};
    });
    const result = await client().updateRecipe('recipe-1', {
      versionId: 'version-2',
      servings: 8,
    });
    assert.deepEqual(result, editedDraft);
    assert.equal(
      calls.some(call => call.url.endsWith('/versions/version-2')),
      true,
    );
    assert.equal(postBody?.['title'], 'Draft Taffy');
    assert.equal(postBody?.['servings'], 8);
    assert.deepEqual(postBody?.['tagIds'], ['tag-1']);
    // The payload was built from the recipe read at revision 1; the server
    // rejects the edit if the recipe has moved past it.
    assert.equal(postBody?.['expectedContentRevision'], 1);
    assert.equal(calls.filter(call => call.init?.method === 'PUT').length, 0);
  });

  test('re-sending the stored ingredients unchanged proceeds as metadata-only', async () => {
    let putSeen = false;
    const calls = stubFetch(call => {
      if (call.init?.method === 'PUT') {
        putSeen = true;
        return {status: 200, body: {}};
      }
      return {status: 200, body: storedRecipe};
    });
    await client().updateRecipe('recipe-1', {
      servings: 40,
      ingredients: storedRecipe.ingredients.map(
        ({sortOrder, name, quantity, unit, notes, isOptional}) => ({
          sortOrder,
          name,
          quantity,
          unit,
          notes,
          isOptional,
        }),
      ),
    });
    assert.equal(putSeen, true);
    assert.equal(calls.filter(call => call.init?.method === 'PUT').length, 1);
  });

  test('a concurrent edit triggers one re-merge instead of overwriting it', async () => {
    // First read sees revision 1; the pre-PUT re-read sees revision 2 with
    // a description someone else set meanwhile; the update must preserve
    // that description rather than PUT the stale one.
    const concurrent = {
      ...storedRecipe,
      description: 'Edited elsewhere',
      contentRevision: 2,
    };
    let getCount = 0;
    let putBody: Record<string, unknown> | undefined;
    stubFetch(call => {
      if (call.init?.method === 'PUT') {
        putBody = JSON.parse(String(call.init.body)) as Record<string, unknown>;
        return {status: 200, body: {}};
      }
      getCount += 1;
      return {status: 200, body: getCount === 1 ? storedRecipe : concurrent};
    });
    await client().updateRecipe('recipe-1', {servings: 40});
    assert.equal(putBody?.['servings'], 40);
    assert.equal(putBody?.['description'], 'Edited elsewhere');
  });

  test('a metadata edit between reads is preserved even when contentRevision does not move', async () => {
    // The API's metadata-save path never bumps contentRevision, so a
    // description edited between the two reads arrives with the same
    // revision. The merge must be rebuilt from the fresh read, not from
    // the stale first one.
    const edited = {...storedRecipe, description: 'Edited elsewhere'};
    let getCount = 0;
    let putBody: Record<string, unknown> | undefined;
    stubFetch(call => {
      if (call.init?.method === 'PUT') {
        putBody = JSON.parse(String(call.init.body)) as Record<string, unknown>;
        return {status: 200, body: {}};
      }
      getCount += 1;
      return {status: 200, body: getCount === 1 ? storedRecipe : edited};
    });
    await client().updateRecipe('recipe-1', {servings: 40});
    assert.equal(putBody?.['servings'], 40);
    assert.equal(putBody?.['description'], 'Edited elsewhere');
  });

  test('an activation between reads aborts a metadata update that named the old version', async () => {
    // The caller named version-1; between the first read and the re-read a
    // different version was activated. A PUT would land on the new active
    // version — not the one named — so the update must abort with no write.
    let getCount = 0;
    const calls = stubFetch(() => {
      getCount += 1;
      return {
        status: 200,
        body:
          getCount === 1
            ? storedRecipe
            : {...storedRecipe, versionId: 'version-9', contentRevision: 2},
      };
    });
    await assert.rejects(
      client().updateRecipe('recipe-1', {servings: 40, versionId: 'version-1'}),
      /active version changed/,
    );
    assert.equal(calls.filter(call => call.init?.method === 'PUT').length, 0);
    assert.equal(calls.filter(call => call.init?.method === 'POST').length, 0);
  });

  test('a recipe that keeps changing aborts with a conflict error and no PUT', async () => {
    let revision = 0;
    const calls = stubFetch(() => {
      revision += 1;
      return {status: 200, body: {...storedRecipe, contentRevision: revision}};
    });
    await assert.rejects(
      client().updateRecipe('recipe-1', {servings: 40}),
      /kept changing/,
    );
    assert.equal(calls.filter(call => call.init?.method === 'PUT').length, 0);
  });

  test('a missing or foreign recipe errors and never issues a PUT', async () => {
    const calls = stubFetch(() => ({status: 404, body: 'Recipe not found'}));
    await assert.rejects(
      client().updateRecipe('someone-elses-recipe', {servings: 40}),
      (error: unknown) =>
        error instanceof EciperayApiError && error.status === 404,
    );
    assert.equal(calls.length, 1);
    assert.notEqual(calls[0]?.init?.method, 'PUT');
  });

  test('an empty patch errors before any API call', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedRecipe}));
    await assert.rejects(
      client().updateRecipe('recipe-1', {}),
      /at least one field/,
    );
    assert.equal(calls.length, 0);
  });
});

const storedMeal = {
  id: 'meal-1',
  title: 'Taco Night',
  notes: 'Friday',
  members: [
    {recipeId: 'recipe-1', sortOrder: 1, servings: 4},
    {recipeId: 'recipe-2', sortOrder: 0, servings: 2},
  ],
};

/** A mixed meal (#362): recipes plus stored direct ingredients. */
const storedMixedMeal = {
  ...storedMeal,
  ingredients: [
    {name: 'Rice', quantity: 2, unit: 'cups', sortOrder: 1, servings: 2},
    {name: 'Beans', quantity: 1, unit: 'can', sortOrder: 0, servings: 1},
  ],
};

const storedPlan = {
  id: 'plan-1',
  title: 'Week 1',
  notes: null,
  startsOn: '2026-11-02',
  endsOn: '2026-11-08',
  entries: [
    {
      type: 'recipe' as const,
      id: 'entry-2',
      recipeId: 'recipe-9',
      sortOrder: 1,
      quantity: 1,
      servings: 6,
    },
    {
      type: 'meal' as const,
      id: 'entry-1',
      mealId: 'meal-1',
      sortOrder: 0,
      quantity: 2,
    },
  ],
};

const putBodies = (calls: FetchCall[]) =>
  calls
    .filter(call => call.init?.method === 'PUT')
    .map(
      call => JSON.parse(String(call.init?.body)) as Record<string, unknown>,
    );

type MealPutBody = {
  title: string;
  notes: string | null;
  recipes: {recipeId: string; servings?: number}[];
};

/**
 * Stateful fetch stub for the concurrency tests: reads return a snapshot of the
 * stored record; a PUT replaces it via `applyPut`. Returns an accessor for the
 * current state.
 */
const stubStatefulFetch = <S, B>(
  initial: S,
  applyPut: (state: S, body: B) => S,
): (() => S) => {
  let state = structuredClone(initial);
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      state = applyPut(state, JSON.parse(String(init.body)) as B);
    }
    const snapshot = structuredClone(state);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(snapshot),
      json: async () => snapshot,
    } as Response;
  }) as typeof fetch;
  return () => state;
};

/** A meal PUT replaces the record's title and member list wholesale. */
const applyMealPut = (
  state: typeof storedMeal,
  body: MealPutBody,
): typeof storedMeal => ({
  ...state,
  title: body.title,
  members: body.recipes.map((recipe, index) => ({
    recipeId: recipe.recipeId,
    sortOrder: index,
    servings: recipe.servings ?? 1,
  })),
});

describe('buildMealUpdatePayload', () => {
  test('changing only the title preserves notes and members in stored order', () => {
    const payload = buildMealUpdatePayload(storedMeal, {
      title: 'Burrito Night',
    });
    assert.equal(payload.title, 'Burrito Night');
    assert.equal(payload.notes, 'Friday');
    assert.deepEqual(payload.recipes, [
      {recipeId: 'recipe-2', servings: 2},
      {recipeId: 'recipe-1', servings: 4},
    ]);
  });

  test('explicit null clears notes; provided recipes replace the members', () => {
    const payload = buildMealUpdatePayload(storedMeal, {
      notes: null,
      recipes: [{recipeId: 'recipe-3'}],
    });
    assert.equal(payload.notes, null);
    assert.deepEqual(payload.recipes, [{recipeId: 'recipe-3'}]);
  });

  test('an empty patch is an error', () => {
    assert.throws(
      () => buildMealUpdatePayload(storedMeal, {}),
      /at least one field/,
    );
  });

  test('stored direct ingredients are omitted so the server preserves them without re-estimating (#432)', () => {
    const payload = buildMealUpdatePayload(storedMixedMeal, {
      title: 'Burrito Night',
    });
    // An omitted field preserves the stored rows server-side (and the
    // server spends no estimation calls on that path); a sent list —
    // even the stored one — would be full-replaced and re-estimated.
    // It must be absent, never an explicit empty list, which the
    // server would treat as a replacement that clears the rows.
    assert.equal('ingredients' in payload, false);
    assert.equal(payload.ingredients, undefined);
  });

  test('a stored meal without an ingredients field omits it from the payload (#432)', () => {
    const payload = buildMealUpdatePayload(storedMeal, {
      title: 'Burrito Night',
    });
    assert.equal('ingredients' in payload, false);
  });

  test('provided ingredients are sent in full and replace the stored list (#362)', () => {
    const payload = buildMealUpdatePayload(storedMixedMeal, {
      ingredients: [{name: 'Protein shake', quantity: 1, unit: 'bottle'}],
    });
    assert.deepEqual(payload.ingredients, [
      {name: 'Protein shake', quantity: 1, unit: 'bottle'},
    ]);
  });

  test('an update that would empty the meal entirely is an error (#362)', () => {
    assert.throws(
      () => buildMealUpdatePayload(storedMeal, {recipes: [], ingredients: []}),
      /no recipes and no direct ingredients/,
    );
  });

  test('clearing the recipes is allowed when direct ingredients remain (#362)', () => {
    const payload = buildMealUpdatePayload(storedMixedMeal, {recipes: []});
    assert.deepEqual(payload.recipes, []);
    assert.equal('ingredients' in payload, false);
  });
});

describe('buildMealPlanUpdatePayload', () => {
  test('changing only the title preserves dates and entries in stored order', () => {
    const payload = buildMealPlanUpdatePayload(storedPlan, {title: 'Week 2'});
    assert.equal(payload.title, 'Week 2');
    assert.equal(payload.startsOn, '2026-11-02');
    assert.equal(payload.endsOn, '2026-11-08');
    assert.deepEqual(payload.entries, [
      {mealId: 'meal-1', quantity: 2},
      {recipeId: 'recipe-9', servings: 6, quantity: 1},
    ]);
    assert.deepEqual(mealPlanEntryInputs(storedPlan), payload.entries);
  });

  test('explicit null clears the dates', () => {
    const payload = buildMealPlanUpdatePayload(storedPlan, {
      startsOn: null,
      endsOn: null,
    });
    assert.equal(payload.startsOn, null);
    assert.equal(payload.endsOn, null);
  });

  test('an empty patch is an error', () => {
    assert.throws(
      () => buildMealPlanUpdatePayload(storedPlan, {}),
      /at least one field/,
    );
  });
});

describe('client meal writes', () => {
  test('createMeal POSTs the input to /meals', async () => {
    const calls = stubFetch(() => ({status: 201, body: storedMeal}));
    const result = await client().createMeal({
      title: 'Taco Night',
      recipes: [{recipeId: 'recipe-1', servings: 4}],
    });
    assert.deepEqual(result, storedMeal);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'http://api.test/api/meals');
    assert.equal(calls[0]?.init?.method, 'POST');
  });

  test('updateMeal GETs the stored meal and PUTs the merged payload', async () => {
    const calls = stubFetch(call =>
      call.init?.method === 'PUT'
        ? {status: 200, body: {...storedMeal, title: 'Burrito Night'}}
        : {status: 200, body: storedMeal},
    );
    await client().updateMeal('meal-1', {title: 'Burrito Night'});
    const puts = putBodies(calls);
    assert.equal(puts.length, 1);
    assert.equal(puts[0]?.['title'], 'Burrito Night');
    assert.deepEqual(puts[0]?.['recipes'], [
      {recipeId: 'recipe-2', servings: 2},
      {recipeId: 'recipe-1', servings: 4},
    ]);
  });

  test('updateMeal with an empty patch errors before any API call', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedMeal}));
    await assert.rejects(
      client().updateMeal('meal-1', {}),
      /at least one field/,
    );
    assert.equal(calls.length, 0);
  });

  test('deleteMeal DELETEs and reports the deletion', async () => {
    const calls = stubFetch(() => ({status: 204, body: ''}));
    const result = await client().deleteMeal('meal-1');
    assert.deepEqual(result, {deleted: true, id: 'meal-1'});
    assert.equal(calls[0]?.init?.method, 'DELETE');
    assert.equal(calls[0]?.url, 'http://api.test/api/meals/meal-1');
  });

  test('addRecipeToMeal appends a new member last', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedMeal}));
    await client().addRecipeToMeal('meal-1', {
      recipeId: 'recipe-3',
      servings: 3,
    });
    assert.deepEqual(putBodies(calls)[0]?.['recipes'], [
      {recipeId: 'recipe-2', servings: 2},
      {recipeId: 'recipe-1', servings: 4},
      {recipeId: 'recipe-3', servings: 3},
    ]);
  });

  test('meal write PUTs omit the stored direct ingredients so the server preserves them (#432)', async () => {
    // All three read-merge-PUT paths omit `ingredients`: the server
    // preserves the stored rows for an omitted field and spends no
    // estimation calls on them, while any sent list (including an
    // explicit empty one) would replace — or clear — them.
    const updateCalls = stubFetch(() => ({status: 200, body: storedMixedMeal}));
    await client().updateMeal('meal-1', {title: 'Burrito Night'});
    assert.equal('ingredients' in (putBodies(updateCalls)[0] ?? {}), false);

    const addCalls = stubFetch(() => ({status: 200, body: storedMixedMeal}));
    await client().addRecipeToMeal('meal-1', {
      recipeId: 'recipe-3',
      servings: 3,
    });
    assert.equal('ingredients' in (putBodies(addCalls)[0] ?? {}), false);

    const removeCalls = stubFetch(() => ({status: 200, body: storedMixedMeal}));
    await client().removeRecipeFromMeal('meal-1', 'recipe-2');
    assert.equal('ingredients' in (putBodies(removeCalls)[0] ?? {}), false);
  });

  test('addRecipeToMeal updates servings when the recipe is already a member', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedMeal}));
    await client().addRecipeToMeal('meal-1', {
      recipeId: 'recipe-1',
      servings: 8,
    });
    assert.deepEqual(putBodies(calls)[0]?.['recipes'], [
      {recipeId: 'recipe-2', servings: 2},
      {recipeId: 'recipe-1', servings: 8},
    ]);
  });

  test('concurrent addRecipeToMeal calls are serialized so both additions survive', async () => {
    const getState = stubStatefulFetch(storedMeal, applyMealPut);

    const c = client();
    await Promise.all([
      c.addRecipeToMeal('meal-1', {recipeId: 'recipe-3', servings: 3}),
      c.addRecipeToMeal('meal-1', {recipeId: 'recipe-4', servings: 1}),
    ]);
    assert.deepEqual(
      getState().members.map(member => member.recipeId),
      ['recipe-2', 'recipe-1', 'recipe-3', 'recipe-4'],
    );
  });

  test('addRecipeToMeal matches an existing member when the id case differs', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedMeal}));
    await client().addRecipeToMeal('meal-1', {
      recipeId: 'RECIPE-1',
      servings: 8,
    });
    assert.deepEqual(putBodies(calls)[0]?.['recipes'], [
      {recipeId: 'recipe-2', servings: 2},
      {recipeId: 'recipe-1', servings: 8},
    ]);
  });

  test('concurrent calls from separate client instances are serialized so both additions survive', async () => {
    const getState = stubStatefulFetch(storedMeal, applyMealPut);

    // The HTTP transport creates a fresh client per request; two instances
    // with the same account must still serialize against each other.
    const first = client();
    const second = client();
    await Promise.all([
      first.addRecipeToMeal('meal-1', {recipeId: 'recipe-3', servings: 3}),
      second.addRecipeToMeal('meal-1', {recipeId: 'recipe-4', servings: 1}),
    ]);
    assert.deepEqual(
      getState().members.map(member => member.recipeId),
      ['recipe-2', 'recipe-1', 'recipe-3', 'recipe-4'],
    );
  });

  test('removeRecipeFromMeal PUTs the meal without that recipe', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedMeal}));
    await client().removeRecipeFromMeal('meal-1', 'recipe-2');
    assert.deepEqual(putBodies(calls)[0]?.['recipes'], [
      {recipeId: 'recipe-1', servings: 4},
    ]);
  });

  test('removeRecipeFromMeal matches the member when the id case differs', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedMeal}));
    await client().removeRecipeFromMeal('meal-1', 'RECIPE-2');
    assert.deepEqual(putBodies(calls)[0]?.['recipes'], [
      {recipeId: 'recipe-1', servings: 4},
    ]);
  });

  test('removeRecipeFromMeal refuses a recipe that is not a member, with no PUT', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedMeal}));
    await assert.rejects(
      client().removeRecipeFromMeal('meal-1', 'recipe-99'),
      /not a member/,
    );
    assert.equal(putBodies(calls).length, 0);
  });

  test('removeRecipeFromMeal may remove the last recipe when direct ingredients remain (#362)', async () => {
    const mixed = {
      ...storedMixedMeal,
      members: [
        storedMeal.members.find(member => member.recipeId === 'recipe-2'),
      ],
    };
    const calls = stubFetch(() => ({status: 200, body: mixed}));
    await client().removeRecipeFromMeal('meal-1', 'recipe-2');
    const body = putBodies(calls)[0];
    assert.deepEqual(body?.['recipes'], []);
    // The stored direct ingredients are preserved server-side by
    // omitting the field (#432) — it must not be sent.
    assert.equal(body !== undefined && 'ingredients' in body, false);
  });

  test('removeRecipeFromMeal refuses to empty the meal, with no PUT', async () => {
    const single = {...storedMeal, members: [storedMeal.members[0]]};
    const calls = stubFetch(() => ({status: 200, body: single}));
    await assert.rejects(
      client().removeRecipeFromMeal('meal-1', 'recipe-1'),
      /at least one recipe/,
    );
    assert.equal(putBodies(calls).length, 0);
  });
});

describe('client meal plan writes', () => {
  test('createMealPlan POSTs the input to /meal-plans', async () => {
    const calls = stubFetch(() => ({status: 201, body: storedPlan}));
    const input = {
      title: 'Week 1',
      startsOn: '2026-11-02',
      endsOn: '2026-11-08',
      entries: [{mealId: 'meal-1', quantity: 2}],
    };
    const result = await client().createMealPlan(input);
    assert.deepEqual(result, storedPlan);
    assert.equal(calls[0]?.url, 'http://api.test/api/meal-plans');
    assert.equal(calls[0]?.init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), input);
  });

  test('updateMealPlan GETs the stored plan and PUTs the merged payload', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedPlan}));
    await client().updateMealPlan('plan-1', {endsOn: '2026-11-09'});
    const puts = putBodies(calls);
    assert.equal(puts.length, 1);
    assert.equal(puts[0]?.['endsOn'], '2026-11-09');
    assert.equal(puts[0]?.['startsOn'], '2026-11-02');
    assert.deepEqual(puts[0]?.['entries'], [
      {mealId: 'meal-1', quantity: 2},
      {recipeId: 'recipe-9', servings: 6, quantity: 1},
    ]);
  });

  test('updateMealPlan with an empty patch errors before any API call', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedPlan}));
    await assert.rejects(
      client().updateMealPlan('plan-1', {}),
      /at least one field/,
    );
    assert.equal(calls.length, 0);
  });

  test('deleteMealPlan DELETEs and reports the deletion', async () => {
    const calls = stubFetch(() => ({status: 204, body: ''}));
    const result = await client().deleteMealPlan('plan-1');
    assert.deepEqual(result, {deleted: true, id: 'plan-1'});
    assert.equal(calls[0]?.url, 'http://api.test/api/meal-plans/plan-1');
  });

  test('addMealPlanEntry appends a new entry last', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedPlan}));
    await client().addMealPlanEntry('plan-1', {mealId: 'meal-2'});
    assert.deepEqual(putBodies(calls)[0]?.['entries'], [
      {mealId: 'meal-1', quantity: 2},
      {recipeId: 'recipe-9', servings: 6, quantity: 1},
      {mealId: 'meal-2'},
    ]);
  });

  test('addMealPlanEntry updates an existing recipe entry instead of duplicating it', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedPlan}));
    await client().addMealPlanEntry('plan-1', {
      recipeId: 'recipe-9',
      quantity: 3,
    });
    assert.deepEqual(putBodies(calls)[0]?.['entries'], [
      {mealId: 'meal-1', quantity: 2},
      {recipeId: 'recipe-9', servings: 6, quantity: 3},
    ]);
  });

  test('concurrent addMealPlanEntry calls are serialized so both additions survive', async () => {
    const putEntryLists: string[][] = [];
    stubStatefulFetch(
      storedPlan,
      (
        state,
        body: {entries: {mealId?: string; recipeId?: string}[]},
      ): typeof storedPlan => {
        putEntryLists.push(
          body.entries.map(entry => entry.mealId ?? entry.recipeId ?? '?'),
        );
        return {
          ...state,
          entries: body.entries.map((entry, index) =>
            entry.mealId !== undefined
              ? {
                  type: 'meal' as const,
                  id: `entry-${entry.mealId}`,
                  mealId: entry.mealId,
                  sortOrder: index,
                  quantity: 1,
                }
              : {
                  type: 'recipe' as const,
                  id: `entry-${entry.recipeId}`,
                  recipeId: entry.recipeId ?? '',
                  sortOrder: index,
                  quantity: 1,
                  servings: 1,
                },
          ),
        };
      },
    );

    const c = client();
    await Promise.all([
      c.addMealPlanEntry('plan-1', {mealId: 'meal-2'}),
      c.addMealPlanEntry('plan-1', {mealId: 'meal-3'}),
    ]);
    assert.deepEqual(putEntryLists.at(-1), [
      'meal-1',
      'recipe-9',
      'meal-2',
      'meal-3',
    ]);
  });

  test('addMealPlanEntry matches an existing entry when the id case differs', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedPlan}));
    await client().addMealPlanEntry('plan-1', {
      recipeId: 'RECIPE-9',
      quantity: 3,
    });
    assert.deepEqual(putBodies(calls)[0]?.['entries'], [
      {mealId: 'meal-1', quantity: 2},
      {recipeId: 'recipe-9', servings: 6, quantity: 3},
    ]);
  });

  test('removeMealPlanEntry PUTs the plan without that entry', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedPlan}));
    await client().removeMealPlanEntry('plan-1', 'entry-1');
    assert.deepEqual(putBodies(calls)[0]?.['entries'], [
      {recipeId: 'recipe-9', servings: 6, quantity: 1},
    ]);
  });

  test('removeMealPlanEntry refuses an unknown entry id, with no PUT', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedPlan}));
    await assert.rejects(
      client().removeMealPlanEntry('plan-1', 'entry-99'),
      /not part of meal plan/,
    );
    assert.equal(putBodies(calls).length, 0);
  });

  test('reorderMealPlanEntries PUTs the entries in the requested order', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedPlan}));
    await client().reorderMealPlanEntries('plan-1', ['entry-2', 'entry-1']);
    assert.deepEqual(putBodies(calls)[0]?.['entries'], [
      {recipeId: 'recipe-9', servings: 6, quantity: 1},
      {mealId: 'meal-1', quantity: 2},
    ]);
  });

  test('reorderMealPlanEntries refuses a non-permutation, with no PUT', async () => {
    const calls = stubFetch(() => ({status: 200, body: storedPlan}));
    await assert.rejects(
      client().reorderMealPlanEntries('plan-1', ['entry-1']),
      /exactly once/,
    );
    assert.equal(putBodies(calls).length, 0);
  });
});
