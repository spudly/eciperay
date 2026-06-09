import {createApiProxy, isBrowserDocumentRequest} from './viteProxy.js';

describe('isBrowserDocumentRequest', () => {
  test('returns true for GET requests that accept HTML', () => {
    expect(
      isBrowserDocumentRequest({
        method: 'GET',
        headers: {accept: 'text/html,application/xhtml+xml'},
      }),
    ).toBe(true);
  });

  test('returns true for HEAD requests that accept HTML', () => {
    expect(
      isBrowserDocumentRequest({
        method: 'HEAD',
        headers: {accept: 'text/html'},
      }),
    ).toBe(true);
  });

  test('returns false for API fetch requests', () => {
    expect(
      isBrowserDocumentRequest({method: 'GET', headers: {accept: '*/*'}}),
    ).toBe(false);
  });

  test('returns false for mutating requests', () => {
    expect(
      isBrowserDocumentRequest({
        method: 'POST',
        headers: {accept: 'text/html'},
      }),
    ).toBe(false);
  });
});

describe('createApiProxy', () => {
  test('bypasses document navigations to index.html', () => {
    const proxy = createApiProxy('http://localhost:8080');
    expect(proxy.bypass({method: 'GET', headers: {accept: 'text/html'}})).toBe(
      '/index.html',
    );
  });

  test('proxies API requests', () => {
    const proxy = createApiProxy('http://localhost:8080');
    expect(
      proxy.bypass({method: 'GET', headers: {accept: 'application/json'}}),
    ).toBeUndefined();
    expect(proxy.target).toBe('http://localhost:8080');
  });
});
