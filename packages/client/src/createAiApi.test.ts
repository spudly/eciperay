import {createCreateAiApi} from './createAiApi.js';

describe('createCreateAiApi', () => {
  test('calls create AI session endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue({});
    const api = createCreateAiApi({fetch});

    await api.start('quick pasta for 4');
    await api.get('s1');
    await api.sendMessage('s1', 'add garlic');
    await api.approvePlan('s1');
    await api.createRecipe('s1');
    await api.cancel('s1');

    expect(fetch).toHaveBeenCalledWith('/recipes/import/ai/sessions', {
      method: 'POST',
      body: JSON.stringify({prompt: 'quick pasta for 4'}),
    });
    expect(fetch).toHaveBeenCalledWith('/recipes/import/ai/sessions/s1');
    expect(fetch).toHaveBeenCalledWith(
      '/recipes/import/ai/sessions/s1/messages',
      {method: 'POST', body: JSON.stringify({content: 'add garlic'})},
    );
    expect(fetch).toHaveBeenCalledWith(
      '/recipes/import/ai/sessions/s1/approve-plan',
      {method: 'POST'},
    );
    expect(fetch).toHaveBeenCalledWith(
      '/recipes/import/ai/sessions/s1/create-recipe',
      {method: 'POST'},
    );
    expect(fetch).toHaveBeenCalledWith(
      '/recipes/import/ai/sessions/s1/cancel',
      {method: 'POST'},
    );
  });
});
