import {router} from './router.js';

describe('router', () => {
  test('exports browser router', () => {
    expect(router).toBeDefined();
    expect(typeof router.subscribe).toBe('function');
  });
});
