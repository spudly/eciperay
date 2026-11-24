import {createDiscoveryApi} from './discoveryApi.js';

describe('createDiscoveryApi', () => {
  test('calls show-less endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue({});
    const api = createDiscoveryApi({fetch});

    await api.showLess('r1');
    await api.undoShowLess('r1');
    await api.listShowLess();

    expect(fetch).toHaveBeenCalledWith('/discovery/recipes/r1/show-less', {
      method: 'POST',
    });
    expect(fetch).toHaveBeenCalledWith('/discovery/recipes/r1/show-less', {
      method: 'DELETE',
    });
    expect(fetch).toHaveBeenCalledWith('/discovery/show-less');
  });
});
