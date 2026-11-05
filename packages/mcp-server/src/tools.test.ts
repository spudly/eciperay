import assert from 'node:assert/strict';
import {afterEach, describe, test} from 'node:test';

import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';

import {createEciperayMcpServer} from './mcpServer.js';

const storedRecipe = {
  id: 'recipe-1',
  contentRevision: 1,
  versionId: 'version-1',
  title: 'Salt Water Taffy',
  description: null,
  servings: 1,
  prepTimeMin: null,
  cookTimeMin: null,
  imageUrl: null,
  sourceUrl: null,
  status: 'evolving',
  ingredients: [
    {
      sortOrder: 0,
      name: 'sugar',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Boil'}],
  tags: [],
};

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const connectClient = async () => {
  const server = createEciperayMcpServer({
    apiUrl: 'http://api.test',
    apiToken: '<redacted>',
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({name: 'test-client', version: '0.0.1'});
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
};

describe('update_recipe tool', () => {
  test('is registered alongside the existing tools', async () => {
    const client = await connectClient();
    const {tools} = await client.listTools();
    const names = tools.map(tool => tool.name).sort();
    assert.deepEqual(names, [
      'add_meal_plan_entry',
      'add_recipe_to_meal',
      'create_meal',
      'create_meal_plan',
      'create_recipe',
      'delete_meal',
      'delete_meal_plan',
      'get_meal',
      'get_meal_plan',
      'get_recipe',
      'get_shopping_list',
      'list_meal_plans',
      'list_meals',
      'remove_meal_plan_entry',
      'remove_recipe_from_meal',
      'reorder_meal_plan_entries',
      'search_recipes',
      'update_meal',
      'update_meal_plan',
      'update_recipe',
    ]);
    await client.close();
  });

  test('updating only servings changes that field and no others', async () => {
    const putBodies: unknown[] = [];
    let current: Record<string, unknown> = {...storedRecipe};
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        putBodies.push(body);
        current = {...storedRecipe, ...body};
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(current),
          json: async () => current,
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(current),
        json: async () => current,
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'update_recipe',
      arguments: {id: 'recipe-1', servings: 40},
    });
    assert.notEqual(result.isError, true);
    assert.equal(putBodies.length, 1);
    const sent = putBodies[0] as Record<string, unknown>;
    assert.equal(sent['servings'], 40);
    assert.equal(sent['title'], 'Salt Water Taffy');
    assert.deepEqual(sent['ingredients'], storedRecipe.ingredients);
    assert.deepEqual(sent['instructions'], storedRecipe.instructions);
    const text = (result.content as {type: string; text: string}[])[0]?.text;
    assert.equal((JSON.parse(String(text)) as {servings: number}).servings, 40);
    await client.close();
  });

  test('a content edit with versionId posts a version edit and returns the new version', async () => {
    const postBodies: Record<string, unknown>[] = [];
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postBodies.push(
          JSON.parse(String(init.body)) as Record<string, unknown>,
        );
        const edited = {
          id: 'version-2',
          recipeId: 'recipe-1',
          versionNumber: 2,
          derivedRole: 'active',
          title: 'Salt Water Taffy',
        };
        return {
          ok: true,
          status: 201,
          text: async () => JSON.stringify(edited),
          json: async () => edited,
        } as Response;
      }
      assert.equal(String(url), 'http://api.test/api/recipes/recipe-1');
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(storedRecipe),
        json: async () => storedRecipe,
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'update_recipe',
      arguments: {
        id: 'recipe-1',
        versionId: 'version-1',
        activate: true,
        ingredients: [
          {
            name: 'brown sugar',
            quantity: 2,
            unit: 'cups',
            notes: null,
            isOptional: false,
          },
        ],
      },
    });
    assert.notEqual(result.isError, true);
    assert.equal(postBodies.length, 1);
    assert.equal(postBodies[0]?.['activate'], true);
    assert.deepEqual(
      (postBodies[0]?.['ingredients'] as {name: string}[]).map(
        ingredient => ingredient.name,
      ),
      ['brown sugar'],
    );
    const text = (result.content as {type: string; text: string}[])[0]?.text;
    assert.equal(
      (JSON.parse(String(text)) as {versionNumber: number}).versionNumber,
      2,
    );
    await client.close();
  });

  test('an unknown recipe id surfaces an error instead of a silent no-op', async () => {
    globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 404,
        text: async () => 'Recipe not found',
        json: async () => ({error: 'Recipe not found'}),
      }) as Response) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'update_recipe',
      arguments: {id: 'missing-id', servings: 40},
    });
    assert.equal(result.isError, true);
    await client.close();
  });
});

const MEAL_UUID = '11111111-1111-4111-8111-111111111111';
const RECIPE_UUID = '22222222-2222-4222-8222-222222222222';
const RECIPE2_UUID = '33333333-3333-4333-8333-333333333333';

const resultText = (result: unknown): string =>
  String(
    (result as {content: {type: string; text: string}[]}).content[0]?.text ??
      '',
  );

describe('meal and meal plan write tools', () => {
  test('create_meal_plan POSTs the plan and returns it', async () => {
    const posts: {url: string; body: Record<string, unknown>}[] = [];
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      posts.push({url: String(url), body});
      const created = {id: 'plan-1', ...body, entries: []};
      return {
        ok: true,
        status: 201,
        text: async () => JSON.stringify(created),
        json: async () => created,
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'create_meal_plan',
      arguments: {
        title: 'Week 1',
        startsOn: '2026-11-02',
        endsOn: '2026-11-08',
        entries: [{mealId: MEAL_UUID, quantity: 2}],
      },
    });
    assert.notEqual(result.isError, true);
    assert.equal(posts.length, 1);
    assert.equal(posts[0]?.url, 'http://api.test/api/meal-plans');
    assert.deepEqual(posts[0]?.body['entries'], [
      {mealId: MEAL_UUID, quantity: 2},
    ]);
    assert.equal(
      (JSON.parse(resultText(result)) as {title: string}).title,
      'Week 1',
    );
    await client.close();
  });

  test('create_meal then remove_recipe_from_meal round-trips through GET + PUT', async () => {
    const meal = {
      id: 'meal-1',
      title: 'Taco Night',
      notes: null,
      members: [
        {recipeId: RECIPE_UUID, sortOrder: 0, servings: 4},
        {recipeId: RECIPE2_UUID, sortOrder: 1, servings: 2},
      ],
    };
    const putBodies: Record<string, unknown>[] = [];
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        putBodies.push(
          JSON.parse(String(init.body)) as Record<string, unknown>,
        );
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(meal),
          json: async () => meal,
        } as Response;
      }
      if (init?.method === 'POST') {
        const created = {...meal, entries: undefined};
        return {
          ok: true,
          status: 201,
          text: async () => JSON.stringify(created),
          json: async () => created,
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(meal),
        json: async () => meal,
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const created = await client.callTool({
      name: 'create_meal',
      arguments: {
        title: 'Taco Night',
        recipes: [
          {recipeId: RECIPE_UUID, servings: 4},
          {recipeId: RECIPE2_UUID},
        ],
      },
    });
    assert.notEqual(created.isError, true);

    const removed = await client.callTool({
      name: 'remove_recipe_from_meal',
      arguments: {mealId: 'meal-1', recipeId: RECIPE2_UUID},
    });
    assert.notEqual(removed.isError, true);
    assert.equal(putBodies.length, 1);
    assert.deepEqual(putBodies[0]?.['recipes'], [
      {recipeId: RECIPE_UUID, servings: 4},
    ]);
    await client.close();
  });

  test('create_meal with a duplicate recipeId is an error and writes nothing', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'create_meal',
      arguments: {
        title: 'Taco Night',
        recipes: [{recipeId: RECIPE_UUID}, {recipeId: RECIPE_UUID}],
      },
    });
    assert.equal(result.isError, true);
    assert.equal(fetchCalls, 0);
    await client.close();
  });

  test('update_meal with a duplicate recipeId is an error and writes nothing', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'update_meal',
      arguments: {
        id: 'meal-1',
        recipes: [
          {recipeId: RECIPE_UUID, servings: 2},
          {recipeId: RECIPE_UUID, servings: 4},
        ],
      },
    });
    assert.equal(result.isError, true);
    assert.equal(fetchCalls, 0);
    await client.close();
  });

  test('servings beyond the PostgreSQL integer range are an error and write nothing', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const created = await client.callTool({
      name: 'create_meal',
      arguments: {
        title: 'Taco Night',
        recipes: [{recipeId: RECIPE_UUID, servings: 2_147_483_648}],
      },
    });
    assert.equal(created.isError, true);
    const added = await client.callTool({
      name: 'add_recipe_to_meal',
      arguments: {
        mealId: MEAL_UUID,
        recipeId: RECIPE_UUID,
        servings: 2_147_483_648,
      },
    });
    assert.equal(added.isError, true);
    const planCreated = await client.callTool({
      name: 'create_meal_plan',
      arguments: {
        title: 'Week 1',
        entries: [{recipeId: RECIPE_UUID, servings: 2_147_483_648}],
      },
    });
    assert.equal(planCreated.isError, true);
    const planUpdated = await client.callTool({
      name: 'update_meal_plan',
      arguments: {
        id: 'plan-1',
        entries: [{mealId: MEAL_UUID, quantity: 2_147_483_648}],
      },
    });
    assert.equal(planUpdated.isError, true);
    const entryAdded = await client.callTool({
      name: 'add_meal_plan_entry',
      arguments: {
        mealPlanId: MEAL_UUID,
        recipeId: RECIPE_UUID,
        servings: 2_147_483_648,
      },
    });
    assert.equal(entryAdded.isError, true);
    assert.equal(fetchCalls, 0);
    await client.close();
  });

  test('servings and quantity reject zero, negative, fractional and non-number values and write nothing', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const invalidValues: unknown[] = [0, -1, 1.5, '2'];
    for (const value of invalidValues) {
      const created = await client.callTool({
        name: 'create_meal',
        arguments: {
          title: 'Taco Night',
          recipes: [{recipeId: RECIPE_UUID, servings: value}],
        },
      });
      assert.equal(
        created.isError,
        true,
        `create_meal servings=${String(value)}`,
      );
      const added = await client.callTool({
        name: 'add_recipe_to_meal',
        arguments: {mealId: MEAL_UUID, recipeId: RECIPE_UUID, servings: value},
      });
      assert.equal(
        added.isError,
        true,
        `add_recipe_to_meal servings=${String(value)}`,
      );
      const planCreated = await client.callTool({
        name: 'create_meal_plan',
        arguments: {
          title: 'Week 1',
          entries: [{recipeId: RECIPE_UUID, servings: value}],
        },
      });
      assert.equal(
        planCreated.isError,
        true,
        `create_meal_plan servings=${String(value)}`,
      );
      const planQuantity = await client.callTool({
        name: 'create_meal_plan',
        arguments: {
          title: 'Week 1',
          entries: [{mealId: MEAL_UUID, quantity: value}],
        },
      });
      assert.equal(
        planQuantity.isError,
        true,
        `create_meal_plan quantity=${String(value)}`,
      );
      const entryAdded = await client.callTool({
        name: 'add_meal_plan_entry',
        arguments: {mealPlanId: MEAL_UUID, mealId: MEAL_UUID, quantity: value},
      });
      assert.equal(
        entryAdded.isError,
        true,
        `add_meal_plan_entry quantity=${String(value)}`,
      );
    }
    assert.equal(fetchCalls, 0);
    await client.close();
  });

  test('servings and quantity accept the boundaries 1 and 2147483647', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    for (const value of [1, 2_147_483_647]) {
      fetchCalls = 0;
      await client.callTool({
        name: 'create_meal',
        arguments: {
          title: 'Taco Night',
          recipes: [{recipeId: RECIPE_UUID, servings: value}],
        },
      });
      assert.ok(
        fetchCalls > 0,
        `create_meal servings=${value} should pass validation`,
      );
      fetchCalls = 0;
      await client.callTool({
        name: 'create_meal_plan',
        arguments: {
          title: 'Week 1',
          entries: [{mealId: MEAL_UUID, quantity: value}],
        },
      });
      assert.ok(
        fetchCalls > 0,
        `create_meal_plan quantity=${value} should pass validation`,
      );
    }
    await client.close();
  });

  test('create_meal_plan with an entry carrying both mealId and recipeId is an error and writes nothing', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'create_meal_plan',
      arguments: {
        title: 'Week 1',
        entries: [{mealId: MEAL_UUID, recipeId: RECIPE_UUID}],
      },
    });
    assert.equal(result.isError, true);
    assert.equal(fetchCalls, 0);
    await client.close();
  });

  test('create_meal_plan with servings on a meal entry is an error and writes nothing', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'create_meal_plan',
      arguments: {title: 'Week 1', entries: [{mealId: MEAL_UUID, servings: 4}]},
    });
    assert.equal(result.isError, true);
    assert.equal(fetchCalls, 0);
    await client.close();
  });

  test('add_meal_plan_entry with both mealId and recipeId is an error and writes nothing', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'add_meal_plan_entry',
      arguments: {
        mealPlanId: 'plan-1',
        mealId: MEAL_UUID,
        recipeId: RECIPE_UUID,
      },
    });
    assert.equal(result.isError, true);
    assert.match(resultText(result), /exactly one of mealId or recipeId/);
    assert.equal(fetchCalls, 0);
    await client.close();
  });

  test('reorder_meal_plan_entries PUTs the entries in the new order', async () => {
    const plan = {
      id: 'plan-1',
      title: 'Week 1',
      notes: null,
      startsOn: null,
      endsOn: null,
      entries: [
        {
          type: 'meal',
          id: 'entry-1',
          mealId: MEAL_UUID,
          sortOrder: 0,
          quantity: 1,
        },
        {
          type: 'recipe',
          id: 'entry-2',
          recipeId: RECIPE_UUID,
          sortOrder: 1,
          quantity: 1,
          servings: 4,
        },
      ],
    };
    const putBodies: Record<string, unknown>[] = [];
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        putBodies.push(
          JSON.parse(String(init.body)) as Record<string, unknown>,
        );
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(plan),
        json: async () => plan,
      } as Response;
    }) as typeof fetch;

    const client = await connectClient();
    const result = await client.callTool({
      name: 'reorder_meal_plan_entries',
      arguments: {mealPlanId: 'plan-1', entryIds: ['entry-2', 'entry-1']},
    });
    assert.notEqual(result.isError, true);
    assert.deepEqual(putBodies[0]?.['entries'], [
      {recipeId: RECIPE_UUID, servings: 4, quantity: 1},
      {mealId: MEAL_UUID, quantity: 1},
    ]);
    await client.close();
  });
});
