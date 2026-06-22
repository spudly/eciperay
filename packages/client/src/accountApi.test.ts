import {createAccountApi} from './accountApi.js';

describe('createAccountApi', () => {
  test('calls account endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue({formatVersion: 1});
    const api = createAccountApi({fetch});

    await api.exportData();
    await api.deleteAccount();

    expect(fetch).toHaveBeenCalledWith('/account/export');
    expect(fetch).toHaveBeenCalledWith('/account', {method: 'DELETE'});
  });
});
