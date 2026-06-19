import {createVersionsApi} from './versionsApi.js';

describe('createVersionsApi', () => {
  test('calls version endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue({});
    const api = createVersionsApi({fetch});

    await api.list('r1');
    await api.get('r1', 'v1');
    await api.create('r1');
    await api.put('r1', 'v1', {
      title: 'T',
      servings: 2,
      ingredients: [],
      instructions: [],
      tagIds: [],
    });
    await api.activate('r1', 'v1');
    await api.tweakWithAi('r1', 'make it spicier');

    expect(fetch).toHaveBeenCalledWith('/recipes/r1/versions');
    expect(fetch).toHaveBeenCalledWith('/recipes/r1/versions/v1');
    expect(fetch).toHaveBeenCalledWith('/recipes/r1/versions', {
      method: 'POST',
    });
    expect(fetch).toHaveBeenCalledWith('/recipes/r1/versions/v1', {
      method: 'PUT',
      body: JSON.stringify({
        title: 'T',
        servings: 2,
        ingredients: [],
        instructions: [],
        tagIds: [],
      }),
    });
    expect(fetch).toHaveBeenCalledWith('/recipes/r1/versions/v1/activate', {
      method: 'POST',
    });
    expect(fetch).toHaveBeenCalledWith('/recipes/r1/versions/ai', {
      method: 'POST',
      body: JSON.stringify({prompt: 'make it spicier'}),
    });
  });
});
