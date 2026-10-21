import assert from 'node:assert/strict';
import {afterEach, describe, test} from 'node:test';

import {
  buildRecipeUpdatePayload,
  createClient,
  EciperayApiError,
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

  test('changing ingredients is refused with a clear error and no PUT', async () => {
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
      /cannot change ingredients or instructions/,
    );
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
