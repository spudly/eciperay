import {apiTokensPowerNotice, PLAN_LABELS} from './billingCopy.js';

describe('billingCopy', () => {
  test('labels every plan', () => {
    expect(PLAN_LABELS).toEqual({free: 'Free', plus: 'Plus', power: 'Power'});
  });

  test('builds the Power notice naming the current plan', () => {
    expect(apiTokensPowerNotice('free')).toBe(
      "API access tokens are a Power feature ($8.99/mo). You're on the Free plan — upgrade to create tokens.",
    );
    expect(apiTokensPowerNotice('plus')).toContain("You're on the Plus plan");
  });
});
