import {createApiClient} from './createApiClient.js';
import {createRecipooClient} from './createRecipooClient.js';
import {makeRecipeDetail} from './test/fixtures/recipe.js';

describe('createRecipooClient', () => {
  const makeClient = () => {
    const fetch = jest.fn().mockResolvedValue(makeRecipeDetail());
    return {api: {fetch}, client: createRecipooClient({fetch})};
  };

  test('recipes api methods', async () => {
    const {api, client} = makeClient();
    await client.recipes.list();
    await client.recipes.list({});
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
    await client.recipes.patch('r1', {title: 'New'});
    await client.recipes.delete('r1');
    expect(api.fetch).toHaveBeenCalledWith('/recipes');
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
  });

  test('import, auth, tags, notes, ai, drafts apis', async () => {
    const {api, client} = makeClient();
    await client.import.importUrl('https://example.com');
    await client.import.importImage('base64');
    await client.import.importText('Pasta recipe');
    await client.auth.syncUser();
    await client.tags.list();
    await client.tags.create('Dinner', '#fff');
    await client.tags.delete('t1');
    await client.notes.list('r1');
    await client.notes.create('r1', 'note');
    await client.ai.getConversation('r1');
    await client.ai.chat('r1', 'hi');
    await client.ai.cleanup('r1');
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
    await client.drafts.listPending('r1');
    await client.drafts.approve('r1', 'd1');
    await client.drafts.reject('r1', 'd1');
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
    expect(api.fetch).toHaveBeenCalledWith('/recipes/r1/notes');
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/notes',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith('/recipes/r1/ai/conversation');
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/ai/chat',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/ai/cleanup',
      expect.objectContaining({method: 'POST'}),
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
    expect(api.fetch).toHaveBeenCalledWith('/recipes/r1/drafts?status=pending');
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/drafts/d1/approve',
      expect.objectContaining({method: 'POST'}),
    );
    expect(api.fetch).toHaveBeenCalledWith(
      '/recipes/r1/drafts/d1/reject',
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
    const client = createRecipooClient(api);
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
