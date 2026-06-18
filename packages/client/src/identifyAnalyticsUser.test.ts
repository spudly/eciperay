import {
  createAnalytics,
  createNoopAnalyticsAdapter,
} from './createAnalytics.js';
import {identifyAnalyticsUser} from './identifyAnalyticsUser.js';

describe('identifyAnalyticsUser', () => {
  test('identifies the Supabase user id and email', () => {
    const identify = jest.fn();
    const analytics = createAnalytics(
      {...createNoopAnalyticsAdapter(), identify},
      'web',
    );
    identifyAnalyticsUser(analytics, {
      access_token: 'token',
      user: {id: 'user-1', email: 'chef@example.com'},
    } as never);
    expect(identify).toHaveBeenCalledWith('user-1', {
      email: 'chef@example.com',
    });
  });
});
