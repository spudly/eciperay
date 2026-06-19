import {createApiClient} from './createApiClient.js';
import {createEciperayClient} from './createEciperayClient.js';
import {makeRecipeDetail} from './test/fixtures/recipe.js';

describe('createEciperayClient', () => {
  const makeClient = () => {
    const fetch = jest.fn().mockResolvedValue(makeRecipeDetail());
    return {api: {fetch}, client: createEciperayClient({fetch})};
  };

  test('recipes api methods', async () => {
    const {api, client} = makeClient();
    await client.recipes.list();
    await client.recipes.list({});
    await client.recipes.list({limit: 50, offset: 10});
    await client.recipes.list({search: 'pasta', limit: 50, offset: 10});
    await client.recipes.get('r1');
    await client.recipes.create({
      title: 'T',
      servings: 2,
      ingredients: [],
      instructions: [],
      tagIds: [],
    });
    await client.recipes.put('r1', {
      title: 'T',
      servings: 2,
      ingredients: [],
      instructions: [],
      tagIds: [],
    });
    await client.recipes.patchLifecycle('r1', 'perfected');
    await client.recipes.delete('r1');
    await client.recipes.exportRecipes([
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ]);
    expect(api.fetch).toHaveBeenCalledWith('/recipes');
    expect(api.fetch).toHaveBeenCalledWith('/recipes?limit=50&offset=10');
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes?search=pasta&limit=50&offset=10',
    );
    expect(api.fetch).toHaveBeenCalledWith('/recipes/r1');
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1',
      expect.objectContaining({method: 'PUT'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1',
      expect.objectContaining({method: 'PATCH'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1',
      expect.objectContaining({method: 'DELETE'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/export',
      expect.objectContaining({method: 'POST'}),
    );
  });

  test('recipes listAll fetches all pages', async () => {
    const fetch = jest.fn().mockResolvedValue([]);
    const client = createEciperayClient({fetch});
    await client.recipes.listAll();
    expect(fetch).toHaveBeenCalledWith('/recipes?limit=100&offset=0');
  });

  test('import, auth, tags, ai, versions, cookLogs apis', async () => {
    const {api, client} = makeClient();
    await client.import.importUrl('https://example.com');
    await client.import.importImage('base64');
    await client.import.importText('Pasta recipe');
    await client.import.importAi('quick vegetarian pasta for 4');
    await client.import.importBulk({
      formatVersion: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      recipes: [],
    });
    await client.auth.syncUser();
    await client.tags.list();
    await client.tags.create('Dinner', '#fff');
    await client.tags.delete('t1');
    await client.ai.nutrition('r1');
    await client.ai.substitutions('r1', ['flour', 'salt']);
    await client.ai.generateImage({
      title: 'Soup',
      description: 'Warm soup',
      ingredients: [{name: 'broth', quantity: 4, unit: 'cups'}],
      instructions: ['Simmer broth'],
    });
    await client.ai.generateDescription({
      title: 'Soup',
      ingredients: ['broth'],
      instructions: ['Simmer'],
    });
    await client.versions.list('r1');
    await client.versions.get('r1', 'v1');
    await client.versions.create('r1');
    await client.versions.put('r1', 'v1', {
      title: 'T',
      servings: 2,
      ingredients: [],
      instructions: [],
      tagIds: [],
    });
    await client.versions.activate('r1', 'v1');
    await client.versions.tweakWithAi('r1', 'make it spicier');
    await client.cookLogs.list('r1', 'v1');
    await client.cookLogs.create('r1', 'v1', {notes: 'Great'});
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/import/url',
      expect.any(Object),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/import/image',
      expect.any(Object),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/import/text',
      expect.any(Object),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/import/ai',
      expect.any(Object),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/import/bulk',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/auth/sync',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith('/tags');
    expect(api.fetch).toHaveBeenCalledWith(
      '/tags',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/tags/t1',
      expect.objectContaining({method: 'DELETE'}),
    );
    expect(api.fetch).toHaveBeenCalledWith('/recipes/r1/ai/nutrition');
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/ai/substitutions?missing=flour&missing=salt',
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/ai/generate-image',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/ai/generate-description',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith('/recipes/r1/versions');
    expect(api.fetch).toHaveBeenCalledWith('/recipes/r1/versions/v1');
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/versions',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/versions/v1',
      expect.objectContaining({method: 'PUT'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/versions/v1/activate',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/versions/ai',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith('/recipes/r1/versions/v1/cooks');
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/versions/v1/cooks',
      expect.objectContaining({method: 'POST'}),
    );
  });

  test('createApiClient integrates with fetch', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({id: 'new'}),
      });
    const api = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => 't',
    });
    const client = createEciperayClient(api);
    await client.recipes.create({
      title: 'T',
      servings: 2,
      ingredients: [],
      instructions: [],
      tagIds: [],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/recipes',
      expect.objectContaining({method: 'POST'}),
    );
  });
});
