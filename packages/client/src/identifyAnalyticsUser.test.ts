import {identifyAnalyticsUser} from './identifyAnalyticsUser.js';

describe('identifyAnalyticsUser', () => {
  test('identifies the Supabase user id and email', () => {
    const identifyUser = jest.fn();
    const analytics = {
      identifyUser,
      track: jest.fn(),
      reset: jest.fn(),
      platform: 'web' as const,
    };
    identifyAnalyticsUser(analytics, {
      access_token: 'token',
      user: {id: 'user-1', email: 'chef@example.com'},
    } as never);
    expect(identifyUser).toHaveBeenCalledWith('user-1', {
      email: 'chef@example.com',
    });
  });
});
