import {createCookLogsApi} from './cookLogsApi.js';

describe('createCookLogsApi', () => {
  test('calls cook log endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue({});
    const api = createCookLogsApi({fetch});

    await api.list('r1', 'v1');
    await api.create('r1', 'v1', {notes: 'Great'});

    expect(fetch).toHaveBeenCalledWith('/recipes/r1/versions/v1/cooks');
    expect(fetch).toHaveBeenCalledWith('/recipes/r1/versions/v1/cooks', {
      method: 'POST',
      body: JSON.stringify({notes: 'Great'}),
    });
  });
});
