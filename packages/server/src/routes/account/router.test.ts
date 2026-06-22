import {createMockQuery} from '../../test/mockQuery.js';

import {createAccountRouter} from './router.js';

describe('createAccountRouter', () => {
  test('returns an express router with account routes', () => {
    const router = createAccountRouter(createMockQuery());
    expect(router).toBeDefined();
    expect(router.stack.length).toBeGreaterThan(0);
  });
});
