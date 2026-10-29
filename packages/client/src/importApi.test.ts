import {createImportApi} from './importApi.js';

const makeClient = () => {
  const fetch = jest.fn().mockResolvedValue({});
  return {api: createImportApi({fetch}), fetch};
};

describe('createImportApi duplicate override (#296)', () => {
  test('omits allowDuplicate by default', async () => {
    const {api, fetch} = makeClient();
    await api.importText('Pasta recipe');
    await api.importUrl('https://example.com');
    await api.importImage('base64');
    expect(fetch).toHaveBeenCalledWith('/recipes/import/text', {
      method: 'POST',
      body: JSON.stringify({text: 'Pasta recipe'}),
    });
    expect(fetch).toHaveBeenCalledWith('/recipes/import/url', {
      method: 'POST',
      body: JSON.stringify({url: 'https://example.com'}),
    });
    expect(fetch).toHaveBeenCalledWith('/recipes/import/image', {
      method: 'POST',
      body: JSON.stringify({imageBase64: 'base64'}),
    });
  });

  test('sends allowDuplicate when the user imports anyway', async () => {
    const {api, fetch} = makeClient();
    await api.importText('Pasta recipe', {allowDuplicate: true});
    await api.importUrl('https://example.com', {allowDuplicate: true});
    await api.importImage('base64', {allowDuplicate: true});
    expect(fetch).toHaveBeenCalledWith('/recipes/import/text', {
      method: 'POST',
      body: JSON.stringify({text: 'Pasta recipe', allowDuplicate: true}),
    });
    expect(fetch).toHaveBeenCalledWith('/recipes/import/url', {
      method: 'POST',
      body: JSON.stringify({url: 'https://example.com', allowDuplicate: true}),
    });
    expect(fetch).toHaveBeenCalledWith('/recipes/import/image', {
      method: 'POST',
      body: JSON.stringify({imageBase64: 'base64', allowDuplicate: true}),
    });
  });
});
