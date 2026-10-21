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
      'create_recipe',
      'get_meal_plan',
      'get_recipe',
      'get_shopping_list',
      'list_meal_plans',
      'search_recipes',
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
