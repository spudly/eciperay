import {
  LANDING_DISCOVER_CTA,
  LANDING_FEATURES,
  LANDING_HERO_SUBTITLE,
  LANDING_HERO_TITLE,
  LANDING_MOBILE_APP_CTA,
  LANDING_SIGNUP_CTA,
} from './landingCopy.js';

describe('landingCopy', () => {
  test('exports landing page copy constants', () => {
    expect(LANDING_HERO_TITLE).toBeTruthy();
    expect(LANDING_HERO_SUBTITLE).toBeTruthy();
    expect(LANDING_DISCOVER_CTA).toBeTruthy();
    expect(LANDING_SIGNUP_CTA).toBeTruthy();
    expect(LANDING_MOBILE_APP_CTA).toBeTruthy();
    expect(LANDING_FEATURES).toHaveLength(3);
  });
});
