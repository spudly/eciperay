import {createTweakAiApi} from './tweakAiApi.js';

describe('createTweakAiApi', () => {
  test('calls tweak AI session endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue({});
    const api = createTweakAiApi({fetch});

    await api.start('r1', 'make it spicier');
    await api.get('r1', 's1');
    await api.sendMessage('r1', 's1', 'less salt');
    await api.approvePlan('r1', 's1');
    await api.implement('r1', 's1');
    await api.createVersion('r1', 's1');
    await api.cancel('r1', 's1');

    expect(fetch).toHaveBeenCalledWith('/recipes/r1/tweak-ai-sessions', {
      method: 'POST',
      body: JSON.stringify({prompt: 'make it spicier'}),
    });
    expect(fetch).toHaveBeenCalledWith('/recipes/r1/tweak-ai-sessions/s1');
    expect(fetch).toHaveBeenCalledWith(
      '/recipes/r1/tweak-ai-sessions/s1/messages',
      {method: 'POST', body: JSON.stringify({content: 'less salt'})},
    );
    expect(fetch).toHaveBeenCalledWith(
      '/recipes/r1/tweak-ai-sessions/s1/approve-plan',
      {method: 'POST'},
    );
    expect(fetch).toHaveBeenCalledWith(
      '/recipes/r1/tweak-ai-sessions/s1/implement',
      {method: 'POST'},
    );
    expect(fetch).toHaveBeenCalledWith(
      '/recipes/r1/tweak-ai-sessions/s1/create-version',
      {method: 'POST'},
    );
    expect(fetch).toHaveBeenCalledWith(
      '/recipes/r1/tweak-ai-sessions/s1/cancel',
      {method: 'POST'},
    );
  });
});
